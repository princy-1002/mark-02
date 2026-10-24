"""
CL-01 ML Model — Bi-Temporal Forest Loss Inference Engine
"""

from __future__ import annotations
import numpy as np
from typing import Dict, Any, Tuple, Optional


class ForestLossDetectionModel:
    """
    Bi-temporal change detection model for Sentinel-2 Level-2A imagery.
    Detects canopy clearance while handling cloud masks, nodata, and phenological variations.
    """

    MODEL_VERSION = "1.0.0"

    def __init__(
        self,
        threshold_critical: float = -0.32,
        threshold_high: float = -0.24,
        threshold_moderate: float = -0.16,
        min_canopy_baseline: float = 0.40,
    ):
        self.threshold_critical = threshold_critical
        self.threshold_high = threshold_high
        self.threshold_moderate = threshold_moderate
        self.min_canopy_baseline = min_canopy_baseline

    def predict(
        self,
        before_ndvi: np.ndarray,
        after_ndvi: np.ndarray,
    ) -> Dict[str, Any]:
        """
        Executes inference on paired NDVI rasters.
        Returns differential dNDVI, classified loss mask, and severity bands.
        """
        if before_ndvi.shape != after_ndvi.shape:
            raise ValueError(
                f"Shape mismatch: before raster {before_ndvi.shape} does not match after raster {after_ndvi.shape}."
            )

        # 1. Identify valid pixels (neither is NaN/cloud-masked)
        valid_mask = (~np.isnan(before_ndvi)) & (~np.isnan(after_ndvi))

        # 2. Compute differential NDVI (dNDVI)
        d_ndvi = np.full_like(before_ndvi, np.nan, dtype=np.float32)
        d_ndvi[valid_mask] = after_ndvi[valid_mask] - before_ndvi[valid_mask]

        # 3. Detect canopy loss (must have been canopy before, i.e. before_ndvi >= min_canopy_baseline)
        canopy_baseline = valid_mask & (before_ndvi >= self.min_canopy_baseline)

        # Classification codes:
        # 0: No loss / Stable / Regrowth
        # 1: Moderate Loss / Selective Clearance (dNDVI between -0.24 and -0.16)
        # 2: High Loss (dNDVI between -0.32 and -0.24)
        # 3: Critical Deforestation (dNDVI <= -0.32)
        classification = np.zeros(before_ndvi.shape, dtype=np.uint8)

        m_mod = canopy_baseline & (d_ndvi <= self.threshold_moderate) & (d_ndvi > self.threshold_high)
        m_high = canopy_baseline & (d_ndvi <= self.threshold_high) & (d_ndvi > self.threshold_critical)
        m_crit = canopy_baseline & (d_ndvi <= self.threshold_critical)

        classification[m_mod] = 1
        classification[m_high] = 2
        classification[m_crit] = 3

        # Binary loss mask (1 where loss detected, 0 otherwise)
        binary_loss_mask = np.where(classification > 0, 1, 0).astype(np.uint8)

        total_valid_pixels = int(np.sum(valid_mask))
        loss_pixels = int(np.sum(binary_loss_mask))
        cloud_or_nodata_pixels = int(np.sum(~valid_mask))

        return {
            "d_ndvi": d_ndvi,
            "classification": classification,
            "binary_loss_mask": binary_loss_mask,
            "valid_mask": valid_mask,
            "stats": {
                "total_valid_pixels": total_valid_pixels,
                "loss_pixels": loss_pixels,
                "cloud_or_nodata_pixels": cloud_or_nodata_pixels,
                "critical_pixels": int(np.sum(m_crit)),
                "high_pixels": int(np.sum(m_high)),
                "moderate_pixels": int(np.sum(m_mod)),
            },
        }

    @staticmethod
    def calculate_confidence(
        d_ndvi_mean: float,
        area_ha: float,
        ndvi_before_mean: float,
    ) -> float:
        """
        Calibrated confidence score (0.0 to 1.0) derived from:
        1. Severity of spectral drop (60%)
        2. Cluster size (25%)
        3. Baseline canopy density (15%)
        """
        drop_magnitude = min(abs(d_ndvi_mean) / 0.50, 1.0)
        size_factor = min(area_ha / 5.0, 1.0)
        baseline_factor = min(max(ndvi_before_mean, 0.0) / 0.80, 1.0)

        score = (drop_magnitude * 0.60) + (size_factor * 0.25) + (baseline_factor * 0.15)
        return round(float(np.clip(score, 0.20, 0.99)), 3)
