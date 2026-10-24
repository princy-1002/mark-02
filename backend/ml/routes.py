"""
CL-01 ML Inference & Forest Loss Detection API Routes
FastAPI router mounted under /api/ml.
"""

from __future__ import annotations
import os
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .config import MODEL_INFO
from .jobs import MLJobManager, MLJobStatus
from .pipeline import ML_OUTPUTS_BASE
from .. import data_service

router = APIRouter(prefix="/api/ml", tags=["ml-inference"])
job_manager = MLJobManager()


# ─── Pydantic Request & Response Schemas ──────────────────────────────────────

class InferenceJobRequest(BaseModel):
    satelliteJobId: Optional[str] = Field(None, description="Ingestion job ID containing preprocessed Sentinel-2 rasters")
    beforeRasterPath: Optional[str] = Field(None, description="Relative path to baseline GeoTIFF raster in satellite repository")
    afterRasterPath: Optional[str] = Field(None, description="Relative path to target GeoTIFF raster in satellite repository")
    regionId: str = Field("western-ghats", description="Monitored region identifier")
    minPatchHectares: float = Field(0.50, ge=0.1, le=100.0, description="Minimum cluster area to filter speckle noise")


class InferenceJobResponse(BaseModel):
    job_id: str
    satellite_job_id: Optional[str] = None
    region_id: str
    status: str
    progress_pct: int
    current_stage: str
    created_at: str
    updated_at: str
    detections_count: int = 0
    total_loss_area_ha: float = 0.0
    error_detail: Optional[str] = None
    result_metadata: Optional[Dict[str, Any]] = None
    geojson: Optional[Dict[str, Any]] = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", tags=["ml-inference"])
@router.get("/", tags=["ml-inference"])
def ml_root():
    """ML Forest Loss Inference module index."""
    return {
        "module": "ML Forest Loss Inference",
        "status": "ready",
        "model_info": "/api/ml/model-info",
        "infer": "/api/ml/infer",
        "jobs": "/api/ml/jobs",
    }


@router.get("/model-info", tags=["ml-inference"])
def get_model_info():
    """
    Returns documentation of the active forest loss detection model,
    framework specifications, input requirements, confidence score definition,
    and requirements for future deep learning retraining.
    """
    return {
        "status": "ok",
        "model_architecture": MODEL_INFO,
        "disclaimer": (
            "Model CL01-dNDVI-S2 evaluates calibrated bi-temporal spectral deficit "
            "with SCL atmospheric quality masking. Only pixels exceeding validated "
            "canopy loss thresholds and spatial clustering criteria are flagged as deforestation."
        ),
    }


@router.post("/infer", response_model=InferenceJobResponse, status_code=status.HTTP_202_ACCEPTED, tags=["ml-inference"])
def submit_inference_job(body: InferenceJobRequest):
    """
    Submit a forest-loss ML inference job.
    Accepts an ingested satellite job ID or validated preprocessed raster paths.
    Executes asynchronously in the background.
    """
    try:
        job = job_manager.create_inference_job(
            satellite_job_id=body.satelliteJobId,
            before_raster_path=body.beforeRasterPath,
            after_raster_path=body.afterRasterPath,
            region_id=body.regionId,
            min_patch_hectares=body.minPatchHectares,
        )
        return InferenceJobResponse(**job)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit inference job: {str(e)}")


@router.get("/jobs", response_model=List[InferenceJobResponse], tags=["ml-inference"])
def list_inference_jobs(region_id: Optional[str] = Query(None, alias="regionId")):
    """List all ML inference jobs with status and progress."""
    jobs = job_manager.list_jobs(region_id=region_id)
    return [InferenceJobResponse(**j) for j in jobs]


@router.get("/jobs/{job_id}", response_model=InferenceJobResponse, tags=["ml-inference"])
def get_inference_job(job_id: str):
    """Retrieve details and progress of a specific ML inference job."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"ML job '{job_id}' not found.")
    return InferenceJobResponse(**job)


@router.get("/jobs/{job_id}/geojson", tags=["ml-inference"])
def get_job_geojson(job_id: str):
    """
    Retrieve GeoJSON FeatureCollection of detected deforestation polygons.
    Directly compatible with Cesium 3D Earth and Leaflet map renderers.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"ML job '{job_id}' not found.")
    if job.get("status") != MLJobStatus.COMPLETED or not job.get("geojson"):
        raise HTTPException(status_code=400, detail=f"Job is in '{job.get('status')}' state; GeoJSON results not ready.")
    return job["geojson"]


@router.get("/jobs/{job_id}/mask", tags=["ml-inference"])
def get_job_change_mask(job_id: str):
    """Download the georeferenced change mask GeoTIFF for a completed job."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"ML job '{job_id}' not found.")

    tif_path = os.path.join(ML_OUTPUTS_BASE, job_id, "change_mask.tif")
    if not os.path.isfile(tif_path):
        raise HTTPException(status_code=404, detail=f"Change mask GeoTIFF for job '{job_id}' not found.")

    return FileResponse(
        tif_path,
        media_type="image/tiff",
        filename=f"cl01_change_mask_{job_id}.tif",
    )


@router.get("/jobs/{job_id}/dndvi", tags=["ml-inference"])
def get_job_dndvi_raster(job_id: str):
    """Download the differential NDVI GeoTIFF for a completed job."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"ML job '{job_id}' not found.")

    tif_path = os.path.join(ML_OUTPUTS_BASE, job_id, "d_ndvi.tif")
    if not os.path.isfile(tif_path):
        raise HTTPException(status_code=404, detail=f"dNDVI raster for job '{job_id}' not found.")

    return FileResponse(
        tif_path,
        media_type="image/tiff",
        filename=f"cl01_dndvi_{job_id}.tif",
    )


@router.post("/jobs/{job_id}/publish", tags=["ml-inference"])
def publish_job_detections(job_id: str):
    """
    Publish real ML detections into the platform's active catalog.
    Instantly populates the Forest Loss Detection table, Analytics KPIs, Alert Center, and Reports.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"ML job '{job_id}' not found.")
    if job.get("status") != MLJobStatus.COMPLETED:
        raise HTTPException(status_code=400, detail=f"Cannot publish job in '{job.get('status')}' state.")

    detections = job.get("detections", [])
    if not detections:
        return {"status": "ok", "published_detections": 0, "published_alerts": 0}

    # 1. Add to active detection catalog
    data_service.add_real_detections(detections)

    # 2. Generate active alerts for critical and high severity events
    published_alerts = 0
    now_str = datetime.now(timezone.utc).isoformat()
    for det in detections:
        if det.get("severity") in ("critical", "high"):
            alert_id = f"ALT-ML-{uuid.uuid4().hex[:6].upper()}"
            alert = {
                "id": alert_id,
                "eventId": det["id"],
                "eventName": det["name"],
                "regionId": det["regionId"],
                "regionName": det["regionName"],
                "stateUT": det.get("stateUT", "Monitored Sector"),
                "severity": det["severity"],
                "status": "active",
                "outcome": "Pending Field Investigation",
                "estimatedAreaHa": det["areaHectares"],
                "firstObservationDate": det["detectedDate"],
                "generatedAt": now_str,
                "acknowledgedAt": None,
                "resolvedAt": None,
                "confidence": det["confidenceScore"],
                "isDuplicate": False,
                "parentAlertId": None,
                "notificationChannels": ["dashboard", "automated_ml_pipeline", "email_dispatch"],
                "notes": f"Auto-generated alert from ML change detection ({det['severity'].upper()} priority).",
            }
            data_service.add_real_alert(alert)
            published_alerts += 1

    return {
        "status": "ok",
        "published_detections": len(detections),
        "published_alerts": published_alerts,
        "message": f"Successfully published {len(detections)} ML detection records to platform catalog.",
    }
