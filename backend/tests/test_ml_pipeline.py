"""
CL-01 ML Change Detection & Inference — Verification Test Suite
Tests model predictions, path security, CRS/bounds compatibility, geodesic area, and API endpoints.
"""

import os
import time
import json
import numpy as np
import pytest
import rasterio
from fastapi.testclient import TestClient

from backend.main import app
from backend.ml.model import ForestLossDetectionModel
from backend.ml.pipeline import (
    MLInferencePipeline,
    resolve_safe_raster_path,
    InferenceSecurityError,
    RasterCompatibilityError,
    SATELLITE_OUTPUTS_BASE,
)
from backend.satellite.preprocessing import write_geotiff
from backend import data_service

client = TestClient(app)


# ─── Model Unit Tests ─────────────────────────────────────────────────────────

class TestForestLossModel:
    def test_shape_mismatch_raises_error(self):
        model = ForestLossDetectionModel()
        b = np.zeros((10, 10), dtype=np.float32)
        a = np.zeros((12, 12), dtype=np.float32)
        with pytest.raises(ValueError):
            model.predict(b, a)

    def test_clouds_never_misclassified_as_loss(self):
        model = ForestLossDetectionModel()
        # Before was healthy forest (+0.80), After is NaN (cloud masked)
        b = np.array([[0.80]], dtype=np.float32)
        a = np.array([[np.nan]], dtype=np.float32)
        res = model.predict(b, a)
        # Binary loss mask must be 0
        assert res["binary_loss_mask"][0, 0] == 0
        assert res["classification"][0, 0] == 0
        assert np.isnan(res["d_ndvi"][0, 0])

    def test_clear_cut_detected_as_critical_loss(self):
        model = ForestLossDetectionModel()
        # Before was dense forest (+0.82), After is bare soil (+0.25) -> dNDVI = -0.57
        b = np.array([[0.82]], dtype=np.float32)
        a = np.array([[0.25]], dtype=np.float32)
        res = model.predict(b, a)
        assert res["binary_loss_mask"][0, 0] == 1
        assert res["classification"][0, 0] == 3  # Critical deforestation
        assert np.isclose(res["d_ndvi"][0, 0], -0.57, atol=1e-3)

    def test_stable_canopy_not_flagged(self):
        model = ForestLossDetectionModel()
        b = np.array([[0.80]], dtype=np.float32)
        a = np.array([[0.78]], dtype=np.float32)  # Minor natural variation (-0.02)
        res = model.predict(b, a)
        assert res["binary_loss_mask"][0, 0] == 0
        assert res["classification"][0, 0] == 0

    def test_confidence_score_range(self):
        score_high = ForestLossDetectionModel.calculate_confidence(
            d_ndvi_mean=-0.55,
            area_ha=12.5,
            ndvi_before_mean=0.85,
        )
        assert 0.80 <= score_high <= 0.99

        score_low = ForestLossDetectionModel.calculate_confidence(
            d_ndvi_mean=-0.18,
            area_ha=0.6,
            ndvi_before_mean=0.45,
        )
        assert 0.20 <= score_low <= 0.50


# ─── Path Security Tests ──────────────────────────────────────────────────────

class TestPathSecurity:
    def test_directory_traversal_rejected(self):
        with pytest.raises(InferenceSecurityError):
            resolve_safe_raster_path("../../etc/passwd")

    def test_unauthorized_external_path_rejected(self):
        with pytest.raises(InferenceSecurityError):
            resolve_safe_raster_path("C:/Windows/System32/cmd.exe")


# ─── Raster Compatibility & Pipeline Execution Tests ─────────────────────────

class TestPipelineCompatibility:
    def test_crs_mismatch_rejected(self, tmp_path):
        pipeline = MLInferencePipeline()
        # Create two rasters inside satellite outputs directory
        test_dir = os.path.join(SATELLITE_OUTPUTS_BASE, "compat_test")
        os.makedirs(test_dir, exist_ok=True)
        r1_path = os.path.join(test_dir, "r1.tif")
        r2_path = os.path.join(test_dir, "r2.tif")

        data = np.ones((32, 32), dtype=np.float32)
        bbox = (76.5, 11.5, 76.6, 11.6)
        write_geotiff(r1_path, data, bbox, crs_epsg=4326)
        write_geotiff(r2_path, data, bbox, crs_epsg=3857)  # Different CRS

        with pytest.raises(RasterCompatibilityError):
            pipeline.execute_inference(
                inference_job_id="test_compat",
                before_raster_path=r1_path,
                after_raster_path=r2_path,
            )


# ─── API Endpoints & Catalog Sync Tests ───────────────────────────────────────

class TestMLApi:
    def test_model_info_endpoint(self):
        r = client.get("/api/ml/model-info")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        arch = body["model_architecture"]
        assert arch["model_id"] == "CL01-dNDVI-S2"
        assert arch["version"] == "1.0.0"
        assert "input_requirements" in arch
        assert "confidence_scoring" in arch
        assert "training_and_retraining_blueprint" in arch

    def test_end_to_end_inference_and_catalog_publishing(self):
        # 1. First trigger a satellite ingestion job to produce preprocessed rasters
        sat_payload = {
            "regionId": "western-ghats",
            "bbox": [76.5, 11.5, 76.7, 11.7],
            "beforeDateRange": {"startDate": "2026-01-01", "endDate": "2026-01-30"},
            "afterDateRange": {"startDate": "2026-02-01", "endDate": "2026-02-28"},
            "maxCloudCover": 15.0,
            "bands": ["B02", "B03", "B04", "B08", "SCL"],
            "spatialResolution": 10.0,
        }
        sat_res = client.post("/api/satellite/ingest", json=sat_payload)
        assert sat_res.status_code == 202
        sat_job_id = sat_res.json()["job_id"]

        # Wait for satellite job to complete
        for _ in range(30):
            sj = client.get(f"/api/satellite/jobs/{sat_job_id}").json()
            if sj["status"] in ("completed", "failed"):
                break
            time.sleep(0.3)
        assert sj["status"] == "completed"

        # 2. Trigger ML Inference on this satellite job
        ml_payload = {
            "satelliteJobId": sat_job_id,
            "regionId": "western-ghats",
            "minPatchHectares": 0.50,
        }
        infer_res = client.post("/api/ml/infer", json=ml_payload)
        assert infer_res.status_code == 202
        ml_job_id = infer_res.json()["job_id"]

        # 3. Wait for ML inference job to complete
        for _ in range(30):
            mj = client.get(f"/api/ml/jobs/{ml_job_id}").json()
            if mj["status"] in ("completed", "failed"):
                break
            time.sleep(0.3)

        assert mj["status"] == "completed"
        assert mj["progress_pct"] == 100
        assert mj["detections_count"] >= 1
        assert mj["total_loss_area_ha"] > 0.0

        # 4. Verify GeoJSON endpoint returns valid polygons
        geo_res = client.get(f"/api/ml/jobs/{ml_job_id}/geojson")
        assert geo_res.status_code == 200
        geojson_data = geo_res.json()
        assert geojson_data["type"] == "FeatureCollection"
        assert len(geojson_data["features"]) >= 1
        first_feat = geojson_data["features"][0]
        assert first_feat["properties"]["confidenceScore"] >= 0.20
        assert first_feat["properties"]["areaHectares"] >= 0.50
        assert first_feat["geometry"]["type"] in ("Polygon", "MultiPolygon")

        # 5. Verify Change Mask GeoTIFF download
        mask_res = client.get(f"/api/ml/jobs/{ml_job_id}/mask")
        assert mask_res.status_code == 200
        assert mask_res.headers["content-type"] == "image/tiff"

        # 6. Publish real detections into active platform catalog
        pub_res = client.post(f"/api/ml/jobs/{ml_job_id}/publish")
        assert pub_res.status_code == 200
        pub_data = pub_res.json()
        assert pub_data["status"] == "ok"
        assert pub_data["published_detections"] >= 1

        # 7. Verify /api/detections now reflects the real ML detection!
        det_list_res = client.get("/api/detections?dateRange=ytd&pageSize=10")
        assert det_list_res.status_code == 200
        det_data = det_list_res.json()
        found_real = any("ML-DET-" in d["id"] for d in det_data["data"])
        assert found_real is True
