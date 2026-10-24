"""
CL-01 Backend — AI Model Lab Test Suite
Verifies genuine dataset ingestion, spatial split preparation, PyTorch U-Net training,
model evaluation metrics, model registry persistence, and forest loss inference.
"""

from __future__ import annotations
import os
import time
import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


class TestModelLabCapabilities:
    def test_info_endpoint(self):
        r = client.get("/api/model-lab/info")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "compute_device" in body
        assert "available_architectures" in body
        assert len(body["available_architectures"]) >= 2

    def test_architectures_endpoint(self):
        r = client.get("/api/model-lab/architectures")
        assert r.status_code == 200
        archs = r.json()
        assert any(a["id"] == "unet_satellite_v1" for a in archs)
        assert any(a["id"] == "forest_segnet_light" for a in archs)


class TestDatasetsWorkflow:
    def test_list_datasets_includes_benchmark(self):
        r = client.get("/api/model-lab/datasets")
        assert r.status_code == 200
        datasets = r.json()
        assert len(datasets) >= 1
        benchmark = next((d for d in datasets if d["dataset_id"] == "ds-western-ghats-benchmark"), None)
        assert benchmark is not None
        assert benchmark["image_count"] >= 20
        assert benchmark["has_labels"] is True

    def test_prepare_dataset_splits(self):
        r = client.post("/api/model-lab/datasets/prepare", json={
            "dataset_id": "ds-western-ghats-benchmark",
            "train_split": 0.70,
            "val_split": 0.15,
            "test_split": 0.15,
            "spatial_grouping": True,
            "normalization": "min_max"
        })
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "prepared"
        assert body["train_count"] > 0
        assert body["val_count"] > 0
        assert body["test_count"] > 0
        assert "class_distribution" in body

    def test_reject_invalid_dataset_prepare(self):
        r = client.post("/api/model-lab/datasets/prepare", json={
            "dataset_id": "nonexistent-dataset-id-xyz",
            "train_split": 0.70,
            "val_split": 0.15,
            "test_split": 0.15,
            "spatial_grouping": True,
            "normalization": "min_max"
        })
        assert r.status_code in (404, 422)


class TestRealModelTrainingAndRegistry:
    def test_start_and_track_training_job(self):
        # Trigger real PyTorch training for 2 epochs on the benchmark dataset
        r = client.post("/api/model-lab/training/start", json={
            "dataset_id": "ds-western-ghats-benchmark",
            "model_name": "Test-UNet-Runner",
            "architecture": "forest_segnet_light",
            "task": "forest_loss_segmentation",
            "epochs": 2,
            "batch_size": 4,
            "learning_rate": 0.002,
            "optimizer": "AdamW",
            "loss_function": "Combined_BCE_Dice",
            "use_pretrained": False
        })
        assert r.status_code == 202
        job = r.json()
        job_id = job["job_id"]
        assert job["status"] in ("queued", "training")

        # Poll job until finished (2 epochs takes ~2-5 seconds on CPU)
        max_wait = 30
        start = time.time()
        final_job = None
        while time.time() - start < max_wait:
            time.sleep(0.5)
            jr = client.get(f"/api/model-lab/jobs/{job_id}")
            assert jr.status_code == 200
            jdata = jr.json()
            if jdata["status"] in ("completed", "failed", "cancelled"):
                final_job = jdata
                break

        assert final_job is not None, "Training job timed out"
        assert final_job["status"] == "completed", f"Job failed: {final_job.get('error_detail')}"
        assert len(final_job["loss_history"]) >= 2
        assert final_job["metrics"] is not None
        assert "iou" in final_job["metrics"]
        assert "dice" in final_job["metrics"]
        assert "confusion_matrix" in final_job["metrics"]

    def test_model_registry(self):
        r = client.get("/api/model-lab/models")
        assert r.status_code == 200
        models = r.json()
        assert len(models) >= 1
        baseline = next((m for m in models if m["model_id"] == "mod-cl01-baseline-unet"), None)
        assert baseline is not None
        assert "metrics" in baseline.keys()
        assert baseline["metrics"]["iou"] > 0


class TestInferenceWorkflow:
    def test_run_inference_on_sample(self):
        r = client.post("/api/model-lab/inference/predict", data={
            "sample_name": "sample_sentinel2_clearing.png",
            "model_id": "mod-cl01-baseline-unet",
            "confidence_threshold": 0.50
        })
        assert r.status_code == 200
        body = r.json()
        assert "inference_id" in body
        assert body["total_pixels"] > 0
        assert "forest_loss_pixels" in body
        assert "forest_loss_pct" in body
        assert "mask_image_url" in body
        assert "overlay_image_url" in body
        assert "severity_breakdown" in body
        assert "disclaimer" in body

    def test_reject_inference_missing_model(self):
        r = client.post("/api/model-lab/inference/predict", data={
            "sample_name": "sample_sentinel2_clearing.png",
            "model_id": "nonexistent-model-id",
            "confidence_threshold": 0.50
        })
        assert r.status_code in (404, 422)
