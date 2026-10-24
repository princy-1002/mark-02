"""
CL-01 Satellite Ingestion & Geospatial Processing API Routes
FastAPI router mounted under /api/satellite.
"""

from __future__ import annotations
import os
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .config import PROVIDER_DOCS, get_configured_provider_credentials
from .jobs import JobManager, JobStatus
from .geometry import GeometryValidationError, bbox_to_geojson_polygon, validate_geographic_bbox
from .provider import Sentinel2Provider
from .pipeline import PipelineValidationError, DATA_OUTPUTS_DIR

router = APIRouter(prefix="/api/satellite", tags=["satellite-ingestion"])
job_manager = JobManager()
provider = Sentinel2Provider()


# ─── Pydantic Request & Response Schemas ──────────────────────────────────────

class DateRangeInput(BaseModel):
    startDate: str = Field(..., description="ISO date: YYYY-MM-DD")
    endDate: str = Field(..., description="ISO date: YYYY-MM-DD")


class IngestionJobRequest(BaseModel):
    regionId: str = Field("western-ghats", description="Monitored region identifier")
    bbox: Optional[List[float]] = Field(None, description="[min_lng, min_lat, max_lng, max_lat] in EPSG:4326")
    geometry: Optional[Dict[str, Any]] = Field(None, description="GeoJSON Polygon/MultiPolygon in EPSG:4326")
    beforeDateRange: DateRangeInput = Field(..., description="Baseline acquisition date range")
    afterDateRange: DateRangeInput = Field(..., description="Target comparison date range")
    maxCloudCover: float = Field(15.0, ge=0.0, le=100.0, description="Max acceptable cloud cover percentage")
    bands: List[str] = Field(default=["B02", "B03", "B04", "B08", "SCL"], description="Requested spectral bands")
    spatialResolution: float = Field(10.0, description="Spatial resolution in meters (10m or 20m)")


class IngestionJobResponse(BaseModel):
    job_id: str
    region_id: str
    status: str
    progress_pct: int
    current_stage: str
    created_at: str
    updated_at: str
    request_params: Dict[str, Any]
    error_detail: Optional[str] = None
    result_metadata: Optional[Dict[str, Any]] = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", tags=["satellite-ingestion"])
@router.get("/", tags=["satellite-ingestion"])
def satellite_root():
    """Satellite Ingestion module index."""
    return {
        "module": "Satellite Ingestion Engine",
        "status": "ready",
        "provider_info": "/api/satellite/provider-info",
        "search": "/api/satellite/search",
        "jobs": "/api/satellite/jobs",
    }


@router.get("/provider-info", tags=["satellite-ingestion"])
def get_provider_info():
    """
    Returns documentation of the selected Sentinel-2 satellite data provider,
    coverage, request limits, and legal data terms.
    Reads credentials only from backend environment variables and never exposes secrets.
    """
    creds_status = get_configured_provider_credentials()
    return {
        "status": "ok",
        "documentation": PROVIDER_DOCS,
        "active_configuration": creds_status,
        "disclaimer": (
            "Sentinel-2 imagery is acquired from Copernicus Data Space Ecosystem "
            "and AWS Open Data STAC in compliance with EU Copernicus open data terms. "
            "All pipeline processing maintains full provenance and georeferencing."
        ),
    }


@router.get("/search", tags=["satellite-ingestion"])
def search_scenes(
    min_lng: float = Query(..., ge=-180.0, le=180.0),
    min_lat: float = Query(..., ge=-90.0, le=90.0),
    max_lng: float = Query(..., ge=-180.0, le=180.0),
    max_lat: float = Query(..., ge=-90.0, le=90.0),
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    max_cloud_cover: float = Query(20.0, ge=0.0, le=100.0),
):
    """
    Query available Sentinel-2 scenes for an ROI bounding box and date range.
    Helps analysts inspect real scenes before submitting full ingestion jobs.
    """
    try:
        bbox = validate_geographic_bbox([min_lng, min_lat, max_lng, max_lat])
    except GeometryValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))

    try:
        scenes = provider.search_scenes(
            bbox=list(bbox),
            start_date=start_date,
            end_date=end_date,
            max_cloud_cover=max_cloud_cover,
            limit=10,
        )
        return {
            "total_found": len(scenes),
            "scenes": [s.to_dict() for s in scenes],
            "query_bbox": list(bbox),
            "date_range": {"startDate": start_date, "endDate": end_date},
        }
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/ingest", response_model=IngestionJobResponse, status_code=status.HTTP_202_ACCEPTED, tags=["satellite-ingestion"])
def submit_ingestion_job(body: IngestionJobRequest):
    """
    Submit a satellite data ingestion and geospatial preprocessing job.
    Validates geometry, CRS, and date ordering, then initiates background acquisition.
    """
    # If bbox not passed but region is known, provide default ROI bbox
    bbox = body.bbox
    if bbox is None and body.geometry is None:
        region_defaults = {
            "western-ghats": [76.45, 11.45, 76.75, 11.75],
            "northeast-india": [93.10, 26.15, 93.40, 26.45],
            "amazon-br": [-54.85, -3.45, -54.55, -3.15],
            "congo-drc": [23.40, -0.65, 23.70, -0.35],
            "borneo-id": [113.80, -2.40, 114.10, -2.10],
        }
        bbox = region_defaults.get(body.regionId, [76.45, 11.45, 76.75, 11.75])

    try:
        job = job_manager.create_job(
            region_id=body.regionId,
            before_date_range=body.beforeDateRange.model_dump(),
            after_date_range=body.afterDateRange.model_dump(),
            max_cloud_cover=body.maxCloudCover,
            bands=body.bands,
            spatial_resolution=body.spatialResolution,
            geometry=body.geometry,
            bbox=bbox,
        )
        return IngestionJobResponse(**job)
    except (GeometryValidationError, PipelineValidationError) as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Job creation error: {str(e)}")


@router.get("/jobs", response_model=List[IngestionJobResponse], tags=["satellite-ingestion"])
def list_ingestion_jobs(region_id: Optional[str] = Query(None, alias="regionId")):
    """List all satellite ingestion jobs with real-time status and progress."""
    jobs = job_manager.list_jobs(region_id=region_id)
    return [IngestionJobResponse(**j) for j in jobs]


@router.get("/jobs/{job_id}", response_model=IngestionJobResponse, tags=["satellite-ingestion"])
def get_ingestion_job(job_id: str):
    """Retrieve details, status, and metadata of a specific satellite ingestion job."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return IngestionJobResponse(**job)


@router.get("/jobs/{job_id}/scenes", tags=["satellite-ingestion"])
def get_job_scenes(job_id: str):
    """Retrieve acquired before and after scene metadata for a completed job."""
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    if job.get("status") != JobStatus.COMPLETED or not job.get("result_metadata"):
        raise HTTPException(status_code=400, detail=f"Job is in '{job.get('status')}' state; scenes are not yet available.")
    return job["result_metadata"].get("scenes", {})


@router.get("/jobs/{job_id}/imagery/{period}/{img_type}", tags=["satellite-ingestion"])
def get_job_imagery(job_id: str, period: str, img_type: str):
    """
    Serve generated GeoTIFF or PNG imagery preview for a job.
    - period: 'before' | 'after'
    - img_type: 'rgb' (PNG preview) | 'ndvi' (PNG preview) | 'geotiff_ndvi' | 'geotiff_raw'
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    job_dir = os.path.join(DATA_OUTPUTS_DIR, job_id)
    if not os.path.exists(job_dir):
        raise HTTPException(status_code=404, detail=f"Data directory for job '{job_id}' not found.")

    if img_type == "rgb":
        path = os.path.join(job_dir, "previews", f"{period}_rgb.png")
        if os.path.exists(path):
            return FileResponse(path, media_type="image/png")
    elif img_type == "ndvi":
        path = os.path.join(job_dir, "previews", f"{period}_ndvi.png")
        if os.path.exists(path):
            return FileResponse(path, media_type="image/png")
    elif img_type == "geotiff_ndvi":
        # Find ndvi geotiff in processed/
        proc_dir = os.path.join(job_dir, "processed")
        if os.path.exists(proc_dir):
            for fname in os.listdir(proc_dir):
                if period in fname.lower() or "ndvi_masked" in fname.lower():
                    fpath = os.path.join(proc_dir, fname)
                    return FileResponse(fpath, media_type="image/tiff", filename=fname)
    elif img_type == "geotiff_raw":
        raw_dir = os.path.join(job_dir, "raw")
        if os.path.exists(raw_dir):
            files = [f for f in os.listdir(raw_dir) if f.endswith(".tif")]
            target = files[0] if period == "before" else (files[-1] if len(files) > 1 else files[0])
            fpath = os.path.join(raw_dir, target)
            return FileResponse(fpath, media_type="image/tiff", filename=target)

    raise HTTPException(status_code=404, detail=f"Requested imagery ({period}, {img_type}) not found.")


@router.get("/jobs/{job_id}/footprints", tags=["satellite-ingestion"])
def get_job_footprints(job_id: str):
    """
    Return GeoJSON FeatureCollection containing the region of interest bounding polygon
    and Sentinel-2 tile footprints for 3D Earth visualization.
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    params = job.get("request_params", {})
    bbox = params.get("bbox", [76.45, 11.45, 76.75, 11.75])
    roi_poly = bbox_to_geojson_polygon(bbox)

    features = [
        {
            "type": "Feature",
            "properties": {
                "name": f"ROI Footprint — {params.get('region_id')}",
                "job_id": job_id,
                "type": "roi",
                "status": job.get("status"),
                "cloud_threshold": params.get("max_cloud_cover"),
            },
            "geometry": roi_poly,
        }
    ]

    # If completed, add scene acquisition properties
    meta = job.get("result_metadata")
    if meta and "scenes" in meta:
        for p in ["before", "after"]:
            sc = meta["scenes"].get(p)
            if sc:
                features.append({
                    "type": "Feature",
                    "properties": {
                        "name": f"Sentinel-2 Acquisition ({p.upper()})",
                        "scene_id": sc.get("scene_id"),
                        "sensing_time": sc.get("sensing_time"),
                        "cloud_cover_pct": sc.get("cloud_cover_pct"),
                        "platform": sc.get("platform"),
                        "tile_id": sc.get("tile_id"),
                        "type": f"satellite_scene_{p}",
                    },
                    "geometry": roi_poly,
                })

    return {
        "type": "FeatureCollection",
        "features": features,
    }
