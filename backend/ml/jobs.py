"""
CL-01 ML Inference — Background Job Manager & Persistence
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

from .pipeline import (
    MLInferencePipeline,
    InferenceSecurityError,
    RasterCompatibilityError,
)

logger = logging.getLogger("ml_jobs")

ML_JOBS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ml_jobs")
os.makedirs(ML_JOBS_DIR, exist_ok=True)


class MLJobStatus:
    QUEUED = "queued"
    VALIDATING = "validating"
    INFERRING = "inferring"
    POLYGONIZING = "polygonizing"
    COMPLETED = "completed"
    FAILED = "failed"


class MLJobManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(MLJobManager, cls).__new__(cls)
                cls._instance._init()
            return cls._instance

    def _init(self):
        self.executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="ml_job_")
        self.jobs_dir = ML_JOBS_DIR
        self.pipeline = MLInferencePipeline()
        self._memory_cache: Dict[str, Dict[str, Any]] = {}
        self._load_persisted_jobs()

    def _load_persisted_jobs(self):
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
                        logger.warning("Failed to load ML job file %s: %s", fname, e)
        except Exception as e:
            logger.warning("Could not list ML jobs directory: %s", e)

    def _save_job(self, job: Dict[str, Any]):
        job_id = job["job_id"]
        self._memory_cache[job_id] = job
        fpath = os.path.join(self.jobs_dir, f"{job_id}.json")
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                json.dump(job, f, indent=2)
        except Exception as e:
            logger.error("Failed to persist ML job %s: %s", job_id, e)

    def create_inference_job(
        self,
        satellite_job_id: Optional[str] = None,
        before_raster_path: Optional[str] = None,
        after_raster_path: Optional[str] = None,
        region_id: str = "western-ghats",
        min_patch_hectares: float = 0.50,
    ) -> Dict[str, Any]:
        """
        Validates arguments and schedules an asynchronous ML change detection job.
        """
        if not satellite_job_id and not (before_raster_path and after_raster_path):
            raise ValueError("Either 'satellite_job_id' or both 'before_raster_path' and 'after_raster_path' must be provided.")

        job_id = f"job_ml_{uuid.uuid4().hex[:10]}"
        now_str = datetime.now(timezone.utc).isoformat()

        job_record: Dict[str, Any] = {
            "job_id": job_id,
            "satellite_job_id": satellite_job_id,
            "region_id": region_id,
            "status": MLJobStatus.QUEUED,
            "progress_pct": 0,
            "current_stage": "Queued in ML inference engine",
            "created_at": now_str,
            "updated_at": now_str,
            "request_params": {
                "satellite_job_id": satellite_job_id,
                "before_raster_path": before_raster_path,
                "after_raster_path": after_raster_path,
                "region_id": region_id,
                "min_patch_hectares": min_patch_hectares,
            },
            "error_detail": None,
            "result_metadata": None,
            "geojson": None,
            "detections_count": 0,
            "total_loss_area_ha": 0.0,
        }

        self._save_job(job_record)

        # Submit to background executor
        self.executor.submit(
            self._run_job_worker,
            job_id,
            satellite_job_id,
            before_raster_path,
            after_raster_path,
            region_id,
            min_patch_hectares,
        )

        return job_record

    def _run_job_worker(
        self,
        job_id: str,
        satellite_job_id: Optional[str],
        before_raster_path: Optional[str],
        after_raster_path: Optional[str],
        region_id: str,
        min_patch_hectares: float,
    ):
        job = self.get_job(job_id)
        if not job:
            return

        def update_progress(pct: int, stage: str):
            job["progress_pct"] = pct
            job["current_stage"] = stage
            job["updated_at"] = datetime.now(timezone.utc).isoformat()
            if pct < 30:
                job["status"] = MLJobStatus.VALIDATING
            elif pct < 75:
                job["status"] = MLJobStatus.INFERRING
            elif pct < 100:
                job["status"] = MLJobStatus.POLYGONIZING
            self._save_job(job)

        try:
            if satellite_job_id:
                result = self.pipeline.run_inference_for_satellite_job(
                    inference_job_id=job_id,
                    satellite_job_id=satellite_job_id,
                    min_patch_hectares=min_patch_hectares,
                    progress_callback=update_progress,
                )
            else:
                result = self.pipeline.execute_inference(
                    inference_job_id=job_id,
                    before_raster_path=before_raster_path,
                    after_raster_path=after_raster_path,
                    region_id=region_id,
                    min_patch_hectares=min_patch_hectares,
                    progress_callback=update_progress,
                )

            provenance = result["provenance"]
            geojson = result["geojson"]
            detections = result["detections"]

            job["status"] = MLJobStatus.COMPLETED
            job["progress_pct"] = 100
            job["current_stage"] = f"Inference complete. {len(detections)} deforestation scars detected."
            job["result_metadata"] = provenance
            job["geojson"] = geojson
            job["detections"] = detections
            job["detections_count"] = len(detections)
            job["total_loss_area_ha"] = provenance.get("summary_stats", {}).get("total_loss_area_hectares", 0.0)
            job["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._save_job(job)

        except (InferenceSecurityError, RasterCompatibilityError, FileNotFoundError, ValueError) as e:
            logger.warning("ML inference job %s failed: %s", job_id, e)
            job["status"] = MLJobStatus.FAILED
            job["error_detail"] = str(e)
            job["current_stage"] = f"Failed: {str(e)}"
            job["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._save_job(job)

        except Exception as e:
            logger.exception("Unexpected error in ML job %s: %s", job_id, e)
            job["status"] = MLJobStatus.FAILED
            job["error_detail"] = f"Internal inference pipeline error: {str(e)}"
            job["current_stage"] = "Failed during inference processing"
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
