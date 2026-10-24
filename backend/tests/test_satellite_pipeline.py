"""
CL-01 Satellite Ingestion & Geospatial Preprocessing — Verification Test Suite
Tests geometry validation, cloud masking, rasterio GeoTIFF creation, and API routes.
"""

import os
import time
import numpy as np
import pytest
import rasterio
from fastapi.testclient import TestClient

from backend.main import app
from backend.satellite.geometry import (
    validate_geographic_bbox,
    validate_geojson_geometry,
    GeometryValidationError,
    get_utm_epsg_for_latlng,
)
from backend.satellite.preprocessing import (
    create_cloud_mask,
    compute_normalized_difference,
    write_geotiff,
    SCL_CLOUD_HIGH,
    SCL_CLOUD_SHADOW,
    SCL_VEGETATION,
    SCL_NOT_VEGETATED,
)
from backend.satellite.pipeline import IngestionPipeline, PipelineValidationError
from backend.satellite.config import get_configured_provider_credentials

client = TestClient(app)


# ─── Geometry & CRS Validation Tests ──────────────────────────────────────────

class TestGeometryValidation:
    def test_valid_bbox(self):
        bbox = [76.5, 11.5, 76.8, 11.8]
        res = validate_geographic_bbox(bbox)
        assert res == (76.5, 11.5, 76.8, 11.8)

    def test_invalid_lat_bounds(self):
        with pytest.raises(GeometryValidationError):
            validate_geographic_bbox([76.5, -95.0, 76.8, 11.8])

    def test_invalid_lng_bounds(self):
        with pytest.raises(GeometryValidationError):
            validate_geographic_bbox([185.0, 11.5, 190.0, 11.8])

    def test_inverted_coordinates(self):
        with pytest.raises(GeometryValidationError):
            validate_geographic_bbox([76.8, 11.8, 76.5, 11.5])

    def test_valid_geojson_polygon(self):
        poly = {
            "type": "Polygon",
            "coordinates": [[
                [76.5, 11.5],
                [76.8, 11.5],
                [76.8, 11.8],
                [76.5, 11.8],
                [76.5, 11.5],
            ]],
        }
        res = validate_geojson_geometry(poly)
        assert res["type"] == "Polygon"

    def test_utm_zone_lookup(self):
        # Western Ghats (~76.5°E, 11.5°N) is in UTM Zone 43N (EPSG:32643)
        epsg = get_utm_epsg_for_latlng(11.5, 76.5)
        assert epsg == 32643


# ─── Preprocessing & Scientific Calculation Tests ─────────────────────────────

class TestGeospatialPreprocessing:
    def test_scl_cloud_masking(self):
        scl = np.array([
            [SCL_VEGETATION, SCL_NOT_VEGETATED],
            [SCL_CLOUD_HIGH, SCL_CLOUD_SHADOW],
        ], dtype=np.uint8)

        mask = create_cloud_mask(scl)
        # SCL_VEGETATION and SCL_NOT_VEGETATED are valid (mask == False)
        assert mask[0, 0] == False
        assert mask[0, 1] == False
        # SCL_CLOUD_HIGH and SCL_CLOUD_SHADOW must be masked out (mask == True)
        assert mask[1, 0] == True
        assert mask[1, 1] == True

    def test_ndvi_computation(self):
        # High NIR, low Red = dense canopy
        nir = np.array([[5000, 4000]], dtype=np.uint16)
        red = np.array([[500, 400]], dtype=np.uint16)
        ndvi = compute_normalized_difference(nir, red)
        # Expected: (5000 - 500) / (5000 + 500) = 4500 / 5500 = 0.818
        assert np.isclose(ndvi[0, 0], 4500 / 5500, atol=1e-3)
        assert ndvi[0, 0] > 0.8

    def test_cloud_pixels_never_treated_as_loss(self):
        # Even if values look like bare ground, masked pixels MUST be NaN
        nir = np.array([[1200]], dtype=np.uint16)
        red = np.array([[2000]], dtype=np.uint16)
        mask = np.array([[True]], dtype=bool)  # Cloud masked
        ndvi = compute_normalized_difference(nir, red, mask=mask)
        assert np.isnan(ndvi[0, 0])

    def test_geotiff_georeferencing_with_rasterio(self, tmp_path):
        out_tif = str(tmp_path / "test_output.tif")
        data = np.zeros((64, 64), dtype=np.float32)
        data[10:30, 10:30] = 0.75  # Canopy NDVI
        bbox = (76.5, 11.5, 76.6, 11.6)

        write_geotiff(out_tif, data, bbox, crs_epsg=4326, nodata=-9999.0, band_names=["NDVI"])

        # Open with rasterio and verify geospatial metadata
        with rasterio.open(out_tif) as src:
            assert src.crs.to_epsg() == 4326
            assert src.count == 1
            assert src.width == 64
            assert src.height == 64
            assert np.isclose(src.bounds.left, 76.5)
            assert np.isclose(src.bounds.bottom, 11.5)
            assert np.isclose(src.bounds.right, 76.6)
            assert np.isclose(src.bounds.top, 11.6)
            assert src.nodata == -9999.0
            read_data = src.read(1)
            assert np.isclose(read_data[20, 20], 0.75)


# ─── Pipeline Validation & Job Execution Tests ────────────────────────────────

class TestPipelineValidation:
    def test_date_ordering_validation(self):
        pipeline = IngestionPipeline()
        with pytest.raises(PipelineValidationError):
            # Before end is after after start
            pipeline.validate_request(
                geometry=None,
                bbox=[76.5, 11.5, 76.8, 11.8],
                before_range={"startDate": "2026-03-01", "endDate": "2026-04-15"},
                after_range={"startDate": "2026-02-01", "endDate": "2026-02-28"},
                max_cloud_cover=15.0,
                bands=["B02", "B04", "B08"],
            )


# ─── API Endpoint Tests ───────────────────────────────────────────────────────

class TestSatelliteApi:
    def test_provider_info_endpoint(self):
        r = client.get("/api/satellite/provider-info")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "documentation" in body
        assert "Copernicus" in body["documentation"]["provider_name"]
        # Ensure secret credentials or raw tokens are NEVER leaked in active_configuration
        active_config = body["active_configuration"]
        assert "password" not in active_config
        assert "client_secret" not in active_config
        assert "api_key" not in active_config
        assert "token" not in active_config
        assert "is_authenticated" in active_config

    def test_search_endpoint(self):
        r = client.get(
            "/api/satellite/search",
            params={
                "min_lng": 76.5,
                "min_lat": 11.5,
                "max_lng": 76.8,
                "max_lat": 11.8,
                "start_date": "2026-01-01",
                "end_date": "2026-03-01",
                "max_cloud_cover": 25.0,
            },
        )
        assert r.status_code == 200
        body = r.json()
        assert "total_found" in body
        assert "query_bbox" in body

    def test_ingest_job_lifecycle(self):
        # 1. Submit ingestion job
        payload = {
            "regionId": "western-ghats",
            "bbox": [76.5, 11.5, 76.7, 11.7],
            "beforeDateRange": {"startDate": "2026-01-05", "endDate": "2026-02-10"},
            "afterDateRange": {"startDate": "2026-02-15", "endDate": "2026-03-25"},
            "maxCloudCover": 20.0,
            "bands": ["B02", "B03", "B04", "B08", "SCL"],
            "spatialResolution": 10.0,
        }
        res = client.post("/api/satellite/ingest", json=payload)
        assert res.status_code == 202
        job_data = res.json()
        job_id = job_data["job_id"]
        assert job_id.startswith("job_sat_")

        # 2. Wait briefly for background execution to complete (mock/synthetic is fast)
        for _ in range(30):
            status_res = client.get(f"/api/satellite/jobs/{job_id}")
            assert status_res.status_code == 200
            current_job = status_res.json()
            if current_job["status"] in ("completed", "failed"):
                break
            time.sleep(0.3)

        assert current_job["status"] == "completed"
        assert current_job["progress_pct"] == 100
        assert current_job["result_metadata"] is not None

        # 3. Verify scenes endpoint
        scenes_res = client.get(f"/api/satellite/jobs/{job_id}/scenes")
        assert scenes_res.status_code == 200
        scenes_data = scenes_res.json()
        assert "before" in scenes_data
        assert "after" in scenes_data
        assert scenes_data["before"]["cloud_cover_pct"] <= 20.0

        # 4. Verify footprints GeoJSON endpoint
        fp_res = client.get(f"/api/satellite/jobs/{job_id}/footprints")
        assert fp_res.status_code == 200
        fp_data = fp_res.json()
        assert fp_data["type"] == "FeatureCollection"
        assert len(fp_data["features"]) >= 1

        # 5. Verify imagery previews
        img_res = client.get(f"/api/satellite/jobs/{job_id}/imagery/before/rgb")
        assert img_res.status_code == 200
        assert img_res.headers["content-type"] == "image/png"
