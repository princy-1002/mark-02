"""
CL-01 AI Model Lab — FastAPI API Routes
Mounted under prefix: /api/model-lab
"""

from __future__ import annotations
import os
import shutil
import tempfile
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form, status, Response
from fastapi.responses import FileResponse

from .config import (
    SUPPORTED_ARCHITECTURES,
    get_compute_device_info,
    DATASETS_DIR,
    JOBS_DIR,
    MODELS_DIR,
    INFERENCE_DIR,
    MAX_DATASET_UPLOAD_BYTES,
    MAX_INFERENCE_IMAGE_BYTES
)
from .schemas import (
    DatasetSummary,
    DatasetPrepareRequest,
    DatasetPrepareResponse,
    ModelTrainingConfigRequest,
    TrainingJobResponse,
    ModelRegistryItem,
    InferenceResultResponse
)
from .datasets import DatasetManager, DatasetSecurityError, DatasetValidationError
from .trainer import TrainingJobManager
from .registry import ModelRegistry
from .inference import InferencePipeline

router = APIRouter(prefix="/api/model-lab", tags=["ai-model-lab"])

dataset_manager = DatasetManager()
job_manager = TrainingJobManager()
registry = ModelRegistry()
inference_pipeline = InferencePipeline()


# ─── System & Capabilities ───────────────────────────────────────────────────

@router.get("", tags=["ai-model-lab"])
@router.get("/", tags=["ai-model-lab"])
def model_lab_root():
    """Module service index for AI Model Lab."""
    return {
        "module": "CL-01 AI Model Lab",
        "status": "ready",
        "endpoints": {
            "info": "/api/model-lab/info",
            "architectures": "/api/model-lab/architectures",
            "datasets": "/api/model-lab/datasets",
            "upload_dataset": "/api/model-lab/datasets/upload",
            "prepare_dataset": "/api/model-lab/datasets/prepare",
            "start_training": "/api/model-lab/training/start",
            "jobs": "/api/model-lab/jobs",
            "models": "/api/model-lab/models",
            "inference": "/api/model-lab/inference/predict",
        },
    }


@router.get("/info", tags=["ai-model-lab"])
def get_model_lab_info():
    """Returns runtime capabilities, compute devices, and active AI model architectures."""
    device_info = get_compute_device_info()
    datasets = dataset_manager.list_datasets()
    models = registry.list_models()
    jobs = job_manager.list_jobs()

    return {
        "status": "ok",
        "service": "CL-01 AI Model Lab",
        "version": "1.0.0",
        "compute_device": device_info,
        "available_architectures": SUPPORTED_ARCHITECTURES,
        "dataset_count": len(datasets),
        "registered_models_count": len(models),
        "total_jobs_count": len(jobs),
        "disclaimer": (
            "Genuine PyTorch convolutional deep learning engine active. "
            "Model predictions and training loss curves are computed directly from raster arrays."
        )
    }


@router.get("/architectures", tags=["ai-model-lab"])
def get_supported_architectures():
    """Lists validated, genuinely implemented neural network architectures."""
    return SUPPORTED_ARCHITECTURES


# ─── Datasets ────────────────────────────────────────────────────────────────

@router.get("/datasets", response_model=List[DatasetSummary], tags=["ai-model-lab"])
def list_datasets():
    """Lists all uploaded and benchmark satellite datasets."""
    return dataset_manager.list_datasets()


@router.post("/datasets/upload", response_model=DatasetSummary, status_code=status.HTTP_201_CREATED, tags=["ai-model-lab"])
async def upload_dataset(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None)
):
    """
    Upload a satellite imagery dataset (ZIP archive containing rasters & ground truth masks).
    Performs server-side path traversal and malicious archive prevention.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing.")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext != ".zip":
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported upload format: '{ext}'. Please upload a .zip archive containing satellite imagery patches and masks."
        )

    # Save to temporary file securely
    temp_fd, temp_path = tempfile.mkstemp(suffix=".zip")
    os.close(temp_fd)

    try:
        total_bytes = 0
        with open(temp_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_DATASET_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Upload exceeds maximum allowed size ({MAX_DATASET_UPLOAD_BYTES // (1024*1024)} MB)."
                    )
                f.write(chunk)

        summary = dataset_manager.process_uploaded_archive(
            zip_file_path=temp_path,
            original_filename=file.filename,
            custom_name=name
        )
        return summary

    except DatasetSecurityError as e:
        raise HTTPException(status_code=400, detail=f"Security Validation Failed: {str(e)}")
    except DatasetValidationError as e:
        raise HTTPException(status_code=422, detail=f"Dataset Validation Error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process archive: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/datasets/{dataset_id}", response_model=DatasetSummary, tags=["ai-model-lab"])
def get_dataset(dataset_id: str):
    """Retrieves dataset details and preview gallery."""
    ds = dataset_manager.get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail=f"Dataset '{dataset_id}' not found.")
    return ds


@router.delete("/datasets/{dataset_id}", tags=["ai-model-lab"])
def delete_dataset(dataset_id: str):
    """Deletes an uploaded dataset and its imagery."""
    if dataset_id == "ds-western-ghats-benchmark":
        raise HTTPException(status_code=400, detail="Cannot delete built-in benchmark dataset.")
    success = dataset_manager.delete_dataset(dataset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return {"status": "ok", "message": f"Dataset '{dataset_id}' deleted."}


@router.get("/datasets/{dataset_id}/previews/{filename}", tags=["ai-model-lab"])
def get_dataset_preview_image(dataset_id: str, filename: str):
    """Serves thumbnail preview of a satellite scene in the dataset."""
    safe_name = os.path.basename(filename)
    img_path = os.path.join(DATASETS_DIR, dataset_id, "previews", safe_name)
    if not os.path.exists(img_path):
        raise HTTPException(status_code=404, detail="Preview thumbnail not found.")
    return FileResponse(img_path, media_type="image/jpeg")


@router.post("/datasets/prepare", response_model=DatasetPrepareResponse, tags=["ai-model-lab"])
def prepare_dataset(body: DatasetPrepareRequest):
    """
    Prepares dataset for neural network training by creating Train/Val/Test splits
    with geographic scene grouping to prevent spatial data leakage.
    """
    try:
        response = dataset_manager.prepare_dataset_splits(
            dataset_id=body.dataset_id,
            train_split=body.train_split,
            val_split=body.val_split,
            test_split=body.test_split,
            spatial_grouping=body.spatial_grouping
        )
        return response
    except DatasetValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dataset preparation failed: {str(e)}")


# ─── Real Training Jobs ───────────────────────────────────────────────────────

@router.post("/training/start", response_model=TrainingJobResponse, status_code=status.HTTP_202_ACCEPTED, tags=["ai-model-lab"])
def start_model_training(body: ModelTrainingConfigRequest):
    """
    Starts genuine PyTorch neural network training in a background thread.
    Tracks epoch loss curves, validation metrics, and persists trained weights.
    """
    try:
        job = job_manager.start_training(body)
        return job
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start training: {str(e)}")


@router.get("/jobs", response_model=List[TrainingJobResponse], tags=["ai-model-lab"])
def list_training_jobs():
    """Lists all active and completed training jobs."""
    return job_manager.list_jobs()


@router.get("/jobs/{job_id}", response_model=TrainingJobResponse, tags=["ai-model-lab"])
def get_training_job(job_id: str):
    """Retrieves live job status, epoch-by-epoch loss history, and execution logs."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Training job '{job_id}' not found.")
    return job


@router.post("/jobs/{job_id}/cancel", tags=["ai-model-lab"])
def cancel_training_job(job_id: str):
    """Requests safe cancellation of a running training job."""
    success = job_manager.cancel_job(job_id)
    if not success:
        raise HTTPException(status_code=400, detail=f"Job '{job_id}' cannot be cancelled or is not active.")
    return {"status": "ok", "message": f"Job '{job_id}' cancelled."}


@router.get("/jobs/{job_id}/eval-samples/{filename}", tags=["ai-model-lab"])
def get_job_evaluation_sample(job_id: str, filename: str):
    """Serves qualitative evaluation comparison images."""
    safe_name = os.path.basename(filename)
    path = os.path.join(JOBS_DIR, job_id, "eval_samples", safe_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Evaluation visual sample not found.")
    return FileResponse(path, media_type="image/png")


# ─── Model Registry & Saved Versions ─────────────────────────────────────────

@router.get("/models", response_model=List[ModelRegistryItem], tags=["ai-model-lab"])
def list_registered_models():
    """Lists all trained and registered model versions."""
    return registry.list_models()


@router.get("/models/{model_id}", response_model=ModelRegistryItem, tags=["ai-model-lab"])
def get_registered_model(model_id: str):
    """Retrieves metadata and evaluation metrics for a registered model."""
    m = registry.get_model(model_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found.")
    return m


@router.delete("/models/{model_id}", tags=["ai-model-lab"])
def delete_registered_model(model_id: str):
    """Deletes a saved model version."""
    if model_id == "mod-cl01-baseline-unet":
        raise HTTPException(status_code=400, detail="Cannot delete baseline reference model.")
    success = registry.delete_model(model_id)
    if not success:
        raise HTTPException(status_code=404, detail="Model not found.")
    return {"status": "ok", "message": f"Model '{model_id}' deleted."}


@router.get("/models/{model_id}/download-weights", tags=["ai-model-lab"])
def download_model_weights(model_id: str):
    """Downloads trained PyTorch model weights artifact (.pt)."""
    m = registry.get_model(model_id)
    if not m or not os.path.exists(m.weights_path):
        raise HTTPException(status_code=404, detail="Model weights artifact not found.")
    return FileResponse(
        m.weights_path,
        media_type="application/octet-stream",
        filename=f"{m.name}-{m.version}.pt"
    )


# ─── Forest-Loss Inference (Test Predictions) ─────────────────────────────────

@router.post("/inference/predict", response_model=InferenceResultResponse, tags=["ai-model-lab"])
async def run_forest_loss_inference(
    file: Optional[UploadFile] = File(None),
    sample_name: Optional[str] = Form(None),
    model_id: str = Form("mod-cl01-baseline-unet"),
    confidence_threshold: float = Form(0.50)
):
    """
    Executes neural network inference on a new satellite image.
    Generates original, binary loss mask, colorized overlay, and calculates area & confidence.
    """
    # Check if testing with pre-bundled sample
    if sample_name:
        sample_path = os.path.join(INFERENCE_DIR, "samples", os.path.basename(sample_name))
        if not os.path.exists(sample_path):
            raise HTTPException(status_code=404, detail=f"Sample image '{sample_name}' not found.")
        try:
            result = inference_pipeline.run_inference(
                image_path=sample_path,
                original_filename=sample_name,
                model_id=model_id,
                confidence_threshold=confidence_threshold
            )
            return result
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Please upload a satellite imagery file or specify a sample_name.")

    temp_fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(file.filename)[1])
    os.close(temp_fd)

    try:
        total_bytes = 0
        with open(temp_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_INFERENCE_IMAGE_BYTES:
                    raise HTTPException(status_code=413, detail="Image file exceeds 40MB limit.")
                f.write(chunk)

        result = inference_pipeline.run_inference(
            image_path=temp_path,
            original_filename=file.filename,
            model_id=model_id,
            confidence_threshold=confidence_threshold
        )
        return result

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.get("/inference/{inference_id}/{filename}", tags=["ai-model-lab"])
def get_inference_image(inference_id: str, filename: str):
    """Serves original, mask, or overlay images for the inference viewer."""
    safe_name = os.path.basename(filename)
    path = os.path.join(INFERENCE_DIR, inference_id, safe_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Inference artifact not found.")
    return FileResponse(path, media_type="image/png")


@router.get("/inference/{inference_id}/download-mask", tags=["ai-model-lab"])
def download_inference_mask(inference_id: str):
    """Downloads binary forest loss mask as PNG."""
    path = os.path.join(INFERENCE_DIR, inference_id, "loss_mask.png")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Mask file not found.")
    return FileResponse(
        path,
        media_type="image/png",
        filename=f"forest_loss_mask_{inference_id}.png"
    )
