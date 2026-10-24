"""
CL-01 AI Model Lab Configuration & Storage Layout
"""

import os
from typing import Dict, Any

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_LAB_BASE_DIR = os.path.join(BACKEND_DIR, "data", "model_lab")

DATASETS_DIR = os.path.join(MODEL_LAB_BASE_DIR, "datasets")
JOBS_DIR = os.path.join(MODEL_LAB_BASE_DIR, "jobs")
MODELS_DIR = os.path.join(MODEL_LAB_BASE_DIR, "models")
INFERENCE_DIR = os.path.join(MODEL_LAB_BASE_DIR, "inference")

import tempfile

def _resolve_storage_dir(base_path: str, fallback_name: str) -> str:
    try:
        os.makedirs(base_path, exist_ok=True)
        # Verify write permission
        test_file = os.path.join(base_path, ".write_test")
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
        return base_path
    except OSError:
        tmp = os.path.join(tempfile.gettempdir(), "cl01_model_lab", fallback_name)
        os.makedirs(tmp, exist_ok=True)
        return tmp

JOBS_DIR = _resolve_storage_dir(JOBS_DIR, "jobs")
INFERENCE_DIR = _resolve_storage_dir(INFERENCE_DIR, "inference")
try:
    os.makedirs(DATASETS_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)
except OSError:
    pass

# Upload constraints
MAX_DATASET_UPLOAD_BYTES = 200 * 1024 * 1024  # 200 MB
MAX_INFERENCE_IMAGE_BYTES = 40 * 1024 * 1024  # 40 MB
ALLOWED_DATASET_EXTENSIONS = {".zip", ".tif", ".tiff", ".png", ".jpg", ".jpeg", ".geojson", ".json", ".csv"}
ALLOWED_IMAGE_EXTENSIONS = {".tif", ".tiff", ".png", ".jpg", ".jpeg"}

# Genuine supported architectures
SUPPORTED_ARCHITECTURES = [
    {
        "id": "unet_satellite_v1",
        "name": "U-Net Satellite Encoder (Deep Segmentation)",
        "task": "forest_loss_segmentation",
        "description": "Multi-scale U-Net encoder-decoder with skip connections and batch normalization, optimized for boundary-preserving canopy loss segmentation.",
        "input_channels": 3,
        "classes": 2,
        "default_epochs": 10,
        "default_batch_size": 4,
        "default_lr": 0.001,
        "is_available": True,
        "requires_gpu": False,
        "estimated_time_per_epoch_sec": 1.2
    },
    {
        "id": "forest_segnet_light",
        "name": "Lightweight ForestSegNet (Edge / Fast CPU)",
        "task": "forest_loss_segmentation",
        "description": "Compact separable convolutional segmentation model with rapid convergence for edge deployments and quick baseline benchmarking.",
        "input_channels": 3,
        "classes": 2,
        "default_epochs": 12,
        "default_batch_size": 4,
        "default_lr": 0.002,
        "is_available": True,
        "requires_gpu": False,
        "estimated_time_per_epoch_sec": 0.8
    }
]

def get_compute_device_info() -> Dict[str, Any]:
    """Inspects genuine compute device available for ML training/inference."""
    has_torch = False
    cuda_available = False
    device_name = "CPU (Multi-Threaded)"
    cuda_device_count = 0

    try:
        import torch
        has_torch = True
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            cuda_device_count = torch.cuda.device_count()
            device_name = torch.cuda.get_device_name(0)
    except Exception:
        pass

    return {
        "has_pytorch": has_torch,
        "cuda_available": cuda_available,
        "device_type": "cuda" if cuda_available else "cpu",
        "device_name": device_name,
        "device_count": cuda_device_count,
        "recommended_batch_size": 8 if cuda_available else 4,
        "fallback_message": (
            "NVIDIA CUDA acceleration active." if cuda_available
            else "Running on optimized CPU multi-threaded compute. Training runs locally without cloud dependence."
        )
    }
