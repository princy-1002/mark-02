"""
CL-01 AI Model Lab — Real PyTorch Background Model Trainer & Job Manager
"""

from __future__ import annotations
import os
import json
import uuid
import time
import threading
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np
from PIL import Image

try:
    import torch
    import torch.nn as nn
    from torch.utils.data import Dataset, DataLoader
except ImportError:
    torch = None
    nn = None
    Dataset = object
    DataLoader = None

from .config import JOBS_DIR, MODELS_DIR, DATASETS_DIR, get_compute_device_info
from .schemas import (
    ModelTrainingConfigRequest,
    TrainingJobResponse,
    LossPoint,
    ConfusionMatrix,
    QualitativeSample,
    EvaluationMetricsResponse,
    ModelRegistryItem
)
from .architectures import create_model_instance, get_loss_function
from .registry import ModelRegistry


class SatelliteSegmentationDataset(Dataset):
    """PyTorch Dataset for paired satellite rasters and binary canopy loss masks."""

    def __init__(self, dataset_dir: str, image_filenames: List[str], target_size: tuple = (192, 192)):
        self.dataset_dir = dataset_dir
        self.image_filenames = image_filenames
        self.target_size = target_size
        self.img_dir = os.path.join(dataset_dir, "images")
        self.mask_dir = os.path.join(dataset_dir, "masks")

    def __len__(self) -> int:
        return len(self.image_filenames)

    def __getitem__(self, idx: int) -> tuple:
        fname = self.image_filenames[idx]
        stem = os.path.splitext(fname)[0]

        img_path = os.path.join(self.img_dir, fname)
        with Image.open(img_path) as im:
            im = im.convert("RGB").resize(self.target_size, Image.Resampling.BILINEAR)
            img_arr = np.array(im, dtype=np.float32) / 255.0  # (H, W, 3)

        # Look for corresponding mask
        mask_arr = np.zeros(self.target_size, dtype=np.float32)
        if os.path.exists(self.mask_dir):
            for mf in os.listdir(self.mask_dir):
                if stem in mf:
                    with Image.open(os.path.join(self.mask_dir, mf)) as mim:
                        mim = mim.resize(self.target_size, Image.Resampling.NEAREST)
                        m_np = np.array(mim)
                        mask_arr = (m_np > 0).astype(np.float32)
                    break

        # Convert to PyTorch format (C, H, W)
        img_tensor = torch.from_numpy(img_arr.transpose(2, 0, 1))
        mask_tensor = torch.from_numpy(mask_arr).unsqueeze(0)  # (1, H, W)

        return img_tensor, mask_tensor, fname


class TrainingJobManager:
    """Manages real asynchronous model training jobs, background threads, and live logs."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self, jobs_dir: str = JOBS_DIR, models_dir: str = MODELS_DIR):
        if getattr(self, "_initialized", False):
            return
        self.jobs_dir = jobs_dir
        self.models_dir = models_dir
        os.makedirs(self.jobs_dir, exist_ok=True)
        os.makedirs(self.models_dir, exist_ok=True)
        self.active_jobs: Dict[str, Dict[str, Any]] = {}
        self.cancel_flags: Dict[str, bool] = {}
        self.registry = ModelRegistry(self.models_dir)
        self._initialized = True

    def list_jobs(self) -> List[TrainingJobResponse]:
        jobs: List[TrainingJobResponse] = []
        # In-memory active jobs
        for job_data in self.active_jobs.values():
            jobs.append(TrainingJobResponse(**job_data))

        # Persisted jobs on disk
        if os.path.exists(self.jobs_dir):
            for jid in os.listdir(self.jobs_dir):
                if jid in self.active_jobs:
                    continue
                meta_file = os.path.join(self.jobs_dir, jid, "job.json")
                if os.path.exists(meta_file):
                    try:
                        with open(meta_file, "r", encoding="utf-8") as f:
                            data = json.load(f)
                        jobs.append(TrainingJobResponse(**data))
                    except Exception:
                        pass

        jobs.sort(key=lambda j: j.created_at, reverse=True)
        return jobs

    def get_job(self, job_id: str) -> Optional[TrainingJobResponse]:
        if job_id in self.active_jobs:
            return TrainingJobResponse(**self.active_jobs[job_id])

        meta_file = os.path.join(self.jobs_dir, job_id, "job.json")
        if os.path.exists(meta_file):
            with open(meta_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            return TrainingJobResponse(**data)
        return None

    def cancel_job(self, job_id: str) -> bool:
        if job_id in self.cancel_flags:
            self.cancel_flags[job_id] = True
            if job_id in self.active_jobs:
                self.active_jobs[job_id]["status"] = "cancelled"
                self.active_jobs[job_id]["logs"].append(f"[{datetime.now().strftime('%H:%M:%S')}] User requested cancellation.")
            return True
        return False

    def start_training(self, config: ModelTrainingConfigRequest) -> TrainingJobResponse:
        """Starts real PyTorch model training in a dedicated background worker thread."""
        if torch is None:
            raise RuntimeError("PyTorch is not available. Please install torch to train models.")

        ds_dir = os.path.join(DATASETS_DIR, config.dataset_id)
        splits_file = os.path.join(ds_dir, "splits.json")
        if not os.path.exists(splits_file):
            raise ValueError(f"Dataset '{config.dataset_id}' has not been prepared into train/validation splits. Please prepare dataset first.")

        job_id = f"job-{uuid.uuid4().hex[:10]}"
        job_dir = os.path.join(self.jobs_dir, job_id)
        os.makedirs(job_dir, exist_ok=True)

        device_info = get_compute_device_info()
        now_iso = datetime.now(timezone.utc).isoformat()

        job_record = {
            "job_id": job_id,
            "model_name": config.model_name,
            "architecture": config.architecture,
            "dataset_id": config.dataset_id,
            "dataset_name": config.dataset_id,
            "status": "queued",
            "progress_pct": 0,
            "current_epoch": 0,
            "total_epochs": config.epochs,
            "current_train_loss": None,
            "current_val_loss": None,
            "loss_history": [],
            "metrics": None,
            "logs": [
                f"[{datetime.now().strftime('%H:%M:%S')}] Job initialized with architecture '{config.architecture}'.",
                f"[{datetime.now().strftime('%H:%M:%S')}] Compute device: {device_info['device_name']} ({device_info['device_type'].upper()}).",
                f"[{datetime.now().strftime('%H:%M:%S')}] Training parameters: {config.epochs} epochs, batch size {config.batch_size}, lr {config.learning_rate}, optimizer {config.optimizer}.",
            ],
            "compute_device": device_info["device_name"],
            "created_at": now_iso,
            "updated_at": now_iso,
            "error_detail": None,
            "model_version_id": None
        }

        self.active_jobs[job_id] = job_record
        self.cancel_flags[job_id] = False

        # Launch training worker thread
        thread = threading.Thread(
            target=self._run_training_worker,
            args=(job_id, config, ds_dir, job_dir),
            daemon=True
        )
        thread.start()

        return TrainingJobResponse(**job_record)

    def _run_training_worker(
        self,
        job_id: str,
        config: ModelTrainingConfigRequest,
        ds_dir: str,
        job_dir: str
    ):
        try:
            record = self.active_jobs[job_id]
            record["status"] = "training"
            self._log(job_id, "Loading train and validation splits...")

            with open(os.path.join(ds_dir, "splits.json"), "r", encoding="utf-8") as f:
                splits = json.load(f)

            train_files = splits.get("train", [])
            val_files = splits.get("val", [])
            test_files = splits.get("test", [])

            if not train_files:
                raise ValueError("No training samples found in dataset splits.")

            train_ds = SatelliteSegmentationDataset(ds_dir, train_files)
            val_ds = SatelliteSegmentationDataset(ds_dir, val_files) if val_files else train_ds
            test_ds = SatelliteSegmentationDataset(ds_dir, test_files) if test_files else val_ds

            batch_size = min(config.batch_size, len(train_files))
            train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
            val_loader = DataLoader(val_ds, batch_size=max(1, min(batch_size, len(val_ds))), shuffle=False)

            self._log(job_id, f"Loaded {len(train_files)} train samples, {len(val_files)} val samples, {len(test_files)} test samples.")

            # Genuine PyTorch Model instantiation
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            model = create_model_instance(config.architecture, in_channels=3, out_classes=1)
            model = model.to(device)

            criterion = get_loss_function(config.loss_function)

            if config.optimizer == "AdamW":
                optimizer = torch.optim.AdamW(model.parameters(), lr=config.learning_rate, weight_decay=1e-4)
            elif config.optimizer == "SGD":
                optimizer = torch.optim.SGD(model.parameters(), lr=config.learning_rate, momentum=0.9)
            else:
                optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate)

            total_epochs = config.epochs
            best_val_loss = float("inf")
            best_weights_path = os.path.join(job_dir, "best_weights.pt")

            self._log(job_id, f"Beginning neural network training loop on {device}...")

            for epoch in range(1, total_epochs + 1):
                if self.cancel_flags.get(job_id, False):
                    self._log(job_id, "Training stopped by cancellation request.")
                    record["status"] = "cancelled"
                    self._persist_job(job_id)
                    return

                # Training pass
                model.train()
                train_losses = []
                for imgs, masks, _ in train_loader:
                    imgs = imgs.to(device)
                    masks = masks.to(device)

                    optimizer.zero_grad()
                    outputs = model(imgs)
                    loss = criterion(outputs, masks)
                    loss.backward()
                    optimizer.step()

                    train_losses.append(loss.item())

                avg_train_loss = float(np.mean(train_losses))

                # Validation pass
                model.eval()
                val_losses = []
                val_ious = []
                val_dices = []
                with torch.no_grad():
                    for imgs, masks, _ in val_loader:
                        imgs = imgs.to(device)
                        masks = masks.to(device)

                        outputs = model(imgs)
                        v_loss = criterion(outputs, masks)
                        val_losses.append(v_loss.item())

                        # Binary thresholding at 0.5 (logits > 0)
                        preds = (torch.sigmoid(outputs) > 0.5).float()
                        intersection = (preds * masks).sum().item()
                        union = ((preds + masks) > 0).float().sum().item()
                        iou = (intersection + 1e-6) / (union + 1e-6)
                        dice = (2.0 * intersection + 1e-6) / (preds.sum().item() + masks.sum().item() + 1e-6)

                        val_ious.append(iou)
                        val_dices.append(dice)

                avg_val_loss = float(np.mean(val_losses))
                avg_val_iou = float(np.mean(val_ious))
                avg_val_dice = float(np.mean(val_dices))

                # Save best model checkpoint
                if avg_val_loss < best_val_loss:
                    best_val_loss = avg_val_loss
                    torch.save(model.state_dict(), best_weights_path)

                record["current_epoch"] = epoch
                record["progress_pct"] = int((epoch / total_epochs) * 90)
                record["current_train_loss"] = round(avg_train_loss, 4)
                record["current_val_loss"] = round(avg_val_loss, 4)
                record["loss_history"].append({
                    "epoch": epoch,
                    "train_loss": round(avg_train_loss, 4),
                    "val_loss": round(avg_val_loss, 4),
                    "val_iou": round(avg_val_iou, 4),
                    "val_dice": round(avg_val_dice, 4)
                })

                self._log(
                    job_id,
                    f"[Epoch {epoch:02d}/{total_epochs:02d}] Train Loss: {avg_train_loss:.4f} | "
                    f"Val Loss: {avg_val_loss:.4f} | IoU: {avg_val_iou:.3f} | Dice: {avg_val_dice:.3f}"
                )

                time.sleep(0.05)  # Yield CPU thread

            # Final evaluation on held-out test split
            self._log(job_id, "Training phase complete. Running evaluation on held-out test set...")
            record["status"] = "evaluating"
            record["progress_pct"] = 95

            # Load best weights
            if os.path.exists(best_weights_path):
                model.load_state_dict(torch.load(best_weights_path, map_location=device))

            test_metrics, qualitative_samples = self._evaluate_model(
                model=model,
                device=device,
                test_ds=test_ds,
                job_id=job_id,
                job_dir=job_dir
            )

            record["metrics"] = test_metrics
            record["progress_pct"] = 100
            record["status"] = "completed"
            record["updated_at"] = datetime.now(timezone.utc).isoformat()

            # Save version to Model Registry
            version_id = f"v{int(time.time()) % 10000:04d}"
            registry_item = self.registry.register_model(
                model_id=f"mod-{uuid.uuid4().hex[:8]}",
                version=f"1.0.{version_id}",
                name=config.model_name,
                architecture=config.architecture,
                task=config.task,
                dataset_id=config.dataset_id,
                dataset_name=config.dataset_id,
                hyperparameters={
                    "epochs": config.epochs,
                    "batch_size": config.batch_size,
                    "learning_rate": config.learning_rate,
                    "optimizer": config.optimizer,
                    "loss_function": config.loss_function
                },
                metrics={
                    "iou": test_metrics["iou"],
                    "dice": test_metrics["dice"],
                    "precision": test_metrics["precision"],
                    "recall": test_metrics["recall"],
                    "accuracy": test_metrics["accuracy"]
                },
                weights_source_path=best_weights_path,
                description=f"Trained on {config.dataset_id} with {config.epochs} epochs ({config.architecture})."
            )

            record["model_version_id"] = registry_item.model_id
            self._log(job_id, f"Model registered as '{registry_item.name}' (Version {registry_item.version}) in model registry.")
            self._persist_job(job_id)

        except Exception as e:
            record = self.active_jobs.get(job_id)
            if record:
                record["status"] = "failed"
                record["error_detail"] = str(e)
                self._log(job_id, f"ERROR: {str(e)}")
                self._persist_job(job_id)

    def _evaluate_model(
        self,
        model: nn.Module,
        device: torch.device,
        test_ds: SatelliteSegmentationDataset,
        job_id: str,
        job_dir: str
    ) -> tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """Calculates actual confusion matrix and metrics on held-out test data."""
        model.eval()
        tp, fp, tn, fn = 0, 0, 0, 0
        qualitative_samples: List[Dict[str, Any]] = []
        eval_imgs_dir = os.path.join(job_dir, "eval_samples")
        os.makedirs(eval_imgs_dir, exist_ok=True)

        loader = DataLoader(test_ds, batch_size=1, shuffle=False)

        with torch.no_grad():
            for idx, (imgs, masks, filenames) in enumerate(loader):
                imgs = imgs.to(device)
                masks = masks.to(device)

                outputs = model(imgs)
                probs = torch.sigmoid(outputs)
                preds = (probs > 0.5).float()

                p_flat = preds.cpu().numpy().flatten()
                m_flat = masks.cpu().numpy().flatten()

                curr_tp = int(np.sum((p_flat == 1) & (m_flat == 1)))
                curr_fp = int(np.sum((p_flat == 1) & (m_flat == 0)))
                curr_tn = int(np.sum((p_flat == 0) & (m_flat == 0)))
                curr_fn = int(np.sum((p_flat == 0) & (m_flat == 1)))

                tp += curr_tp
                fp += curr_fp
                tn += curr_tn
                fn += curr_fn

                # Save qualitative visual samples for evaluation UI
                if idx < 6:
                    fname = filenames[0]
                    stem = os.path.splitext(fname)[0]

                    # Prediction mask image
                    pred_mask_np = (preds[0, 0].cpu().numpy() * 255).astype(np.uint8)
                    pred_file = f"{stem}_pred.png"
                    Image.fromarray(pred_mask_np).save(os.path.join(eval_imgs_dir, pred_file))

                    # Ground truth mask image
                    gt_mask_np = (masks[0, 0].cpu().numpy() * 255).astype(np.uint8)
                    gt_file = f"{stem}_gt.png"
                    Image.fromarray(gt_mask_np).save(os.path.join(eval_imgs_dir, gt_file))

                    # Difference image (Green = TP, Red = FP, Blue/Purple = FN)
                    diff_arr = np.zeros((*pred_mask_np.shape, 3), dtype=np.uint8)
                    p_2d = preds[0, 0].cpu().numpy()
                    m_2d = masks[0, 0].cpu().numpy()
                    diff_arr[(p_2d == 1) & (m_2d == 1)] = [30, 220, 100]  # True Positive (Green)
                    diff_arr[(p_2d == 1) & (m_2d == 0)] = [230, 50, 50]   # False Positive (Red)
                    diff_arr[(p_2d == 0) & (m_2d == 1)] = [240, 160, 20]  # False Negative (Orange)
                    diff_file = f"{stem}_diff.png"
                    Image.fromarray(diff_arr).save(os.path.join(eval_imgs_dir, diff_file))

                    sample_iou = (curr_tp + 1e-6) / (curr_tp + curr_fp + curr_fn + 1e-6)
                    sample_dice = (2.0 * curr_tp + 1e-6) / (2.0 * curr_tp + curr_fp + curr_fn + 1e-6)

                    qualitative_samples.append({
                        "sample_id": stem,
                        "image_url": f"/api/model-lab/jobs/{job_id}/eval-samples/{stem}_gt.png",
                        "ground_truth_url": f"/api/model-lab/jobs/{job_id}/eval-samples/{stem}_gt.png",
                        "prediction_url": f"/api/model-lab/jobs/{job_id}/eval-samples/{stem}_pred.png",
                        "difference_url": f"/api/model-lab/jobs/{job_id}/eval-samples/{stem}_diff.png",
                        "iou": round(sample_iou, 3),
                        "dice": round(sample_dice, 3)
                    })

        total = tp + fp + tn + fn + 1e-6
        precision = tp / (tp + fp + 1e-6)
        recall = tp / (tp + fn + 1e-6)
        f1 = (2 * precision * recall) / (precision + recall + 1e-6)
        iou = tp / (tp + fp + fn + 1e-6)
        accuracy = (tp + tn) / total
        specificity = tn / (tn + fp + 1e-6)

        metrics = {
            "iou": round(float(iou), 4),
            "dice": round(float(f1), 4),
            "f1_score": round(float(f1), 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "accuracy": round(float(accuracy), 4),
            "specificity": round(float(specificity), 4),
            "confusion_matrix": {
                "true_positive": tp,
                "false_positive": fp,
                "true_negative": tn,
                "false_negative": fn
            },
            "sample_count": len(test_ds),
            "qualitative_samples": qualitative_samples
        }
        return metrics, qualitative_samples

    def _log(self, job_id: str, message: str):
        record = self.active_jobs.get(job_id)
        if record:
            timestamp = datetime.now().strftime("%H:%M:%S")
            line = f"[{timestamp}] {message}"
            record["logs"].append(line)
            record["updated_at"] = datetime.now(timezone.utc).isoformat()

    def _persist_job(self, job_id: str):
        record = self.active_jobs.get(job_id)
        if record:
            meta_path = os.path.join(self.jobs_dir, job_id, "job.json")
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(record, f, indent=2)
