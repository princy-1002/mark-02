"""
CL-01 Satellite Ingestion — Background Job Manager
Persists job records to disk and runs asynchronous preprocessing workers.
"""

from __future__ import annotations
import os
import json
import uuid
import threading
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from concurrent.futures import ThreadPoolExecutor

from .pipeline import IngestionPipeline, PipelineValidationError
from .provider import ImageryUnavailableError

logger = logging.getLogger("satellite_jobs")

import tempfile

JOBS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "jobs")
try:
    os.makedirs(JOBS_DIR, exist_ok=True)
except OSError:
    JOBS_DIR = os.path.join(tempfile.gettempdir(), "cl01_satellite_jobs")
    os.makedirs(JOBS_DIR, exist_ok=True)


class JobStatus:
    QUEUED = "queued"
    SEARCHING = "searching"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(JobManager, cls).__new__(cls)
                cls._instance._init()
            return cls._instance

    def _init(self):
        self.executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="sat_job_")
        self.jobs_dir = JOBS_DIR
        self.pipeline = IngestionPipeline()
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        self._load_persisted_jobs()

    def _load_persisted_jobs(self):
        """Load past jobs from disk cache."""
        try:
            for fname in os.listdir(self.jobs_dir):
                if fname.endswith(".json"):
                    fpath = os.path.join(self.jobs_dir, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8") as f:
                            data = json.load(f)
                            if "job_id" in data:
                                self._memory_cache[data["job_id"]] = data
                    except Exception as e:
                        logger.warning("Failed to load job file %s: %s", fname, e)
        except Exception as e:
            logger.warning("Could not list jobs directory: %s", e)

    def _save_job(self, job: Dict[str, Any]):
        job_id = job["job_id"]
        self._memory_cache[job_id] = job
        fpath = os.path.join(self.jobs_dir, f"{job_id}.json")
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(job, f, indent=2)
        except Exception as e:
            logger.error("Failed to persist job %s: %s", job_id, e)

    def create_job(
        self,
        region_id: str,
        before_date_range: Dict[str, str],
        after_date_range: Dict[str, str],
        max_cloud_cover: float = 15.0,
        bands: Optional[List[str]] = None,
        spatial_resolution: float = 10.0,
        geometry: Optional[Dict[str, Any]] = None,
        bbox: Optional[List[float]] = None,
    ) -> Dict[str, Any]:
        """Validate input and schedule background processing job."""
        bands = bands or ["B02", "B03", "B04", "B08", "SCL"]

        # Validate inputs synchronously before enqueueing
        valid_bbox, geojson_geom = self.pipeline.validate_request(
            geometry=geometry,
            bbox=bbox,
            before_range=before_date_range,
            after_range=after_date_range,
            max_cloud_cover=max_cloud_cover,
            bands=bands,
        )

        job_id = f"job_sat_{uuid.uuid4().hex[:10]}"
        now_str = datetime.now(timezone.utc).isoformat()

        job_record: Dict[str, Any] = {
            "job_id": job_id,
            "region_id": region_id,
            "status": JobStatus.QUEUED,
            "progress_pct": 0,
            "current_stage": "Queued in satellite ingestion pipeline",
            "created_at": now_str,
            "updated_at": now_str,
            "request_params": {
                "region_id": region_id,
                "bbox": list(valid_bbox),
                "geometry": geojson_geom,
                "before_date_range": before_date_range,
                "after_date_range": after_date_range,
                "max_cloud_cover": max_cloud_cover,
                "bands": bands,
                "spatial_resolution": spatial_resolution,
            },
            "error_detail": None,
            "result_metadata": None,
        }

        self._save_job(job_record)

        # Enqueue background execution
        self.executor.submit(
            self._run_job_worker,
            job_id,
            region_id,
            valid_bbox,
            geojson_geom,
            before_date_range,
            after_date_range,
            max_cloud_cover,
            bands,
            spatial_resolution,
        )

        return job_record

    def _run_job_worker(
        self,
        job_id: str,
        region_id: str,
        bbox: Any,
        geojson_geom: Any,
        before_range: Any,
        after_range: Any,
        max_cloud_cover: float,
        bands: List[str],
        spatial_resolution: float,
    ):
        """Worker thread executing the pipeline."""
        job = self.get_job(job_id)
        if not job:
            return

        def update_progress(pct: int, stage: str):
            job["progress_pct"] = pct
            job["current_stage"] = stage
            job["updated_at"] = datetime.now(timezone.utc).isoformat()
            if pct < 30:
                job["status"] = JobStatus.SEARCHING
            elif pct < 70:
                job["status"] = JobStatus.DOWNLOADING
            elif pct < 100:
                job["status"] = JobStatus.PROCESSING
            self._save_job(job)

        try:
            update_progress(5, "Validating Sentinel-2 query parameters...")
            metadata = self.pipeline.execute_ingestion(
                job_id=job_id,
                region_id=region_id,
                bbox=bbox,
                geojson_geom=geojson_geom,
                before_range=before_range,
                after_range=after_range,
                max_cloud_cover=max_cloud_cover,
                bands=bands,
                spatial_resolution=spatial_resolution,
                progress_callback=update_progress,
            )

            job["status"] = JobStatus.COMPLETED
            job["progress_pct"] = 100
            job["current_stage"] = "Preprocessing completed successfully. GeoTIFFs and previews ready."
            job["result_metadata"] = metadata
            job["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._save_job(job)

        except ImageryUnavailableError as e:
            logger.warning("Job %s imagery unavailable: %s", job_id, e)
            job["status"] = JobStatus.FAILED
            job["error_detail"] = f"Imagery unavailable: {str(e)}"
            job["current_stage"] = "Failed: Requested imagery not available meeting constraints"
            job["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._save_job(job)

        except Exception as e:
            logger.exception("Job %s failed with unexpected error: %s", job_id, e)
            job["status"] = JobStatus.FAILED
            job["error_detail"] = f"Processing error: {str(e)}"
            job["current_stage"] = "Failed during geospatial processing"
            job["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._save_job(job)

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self._memory_cache.get(job_id)

    def list_jobs(self, region_id: Optional[str] = None) -> List[Dict[str, Any]]:
        jobs = list(self._memory_cache.values())
        if region_id and region_id != "all":
            jobs = [j for j in jobs if j.get("region_id") == region_id]
        jobs.sort(key=lambda j: j.get("created_at", ""), reverse=True)
        return jobs
