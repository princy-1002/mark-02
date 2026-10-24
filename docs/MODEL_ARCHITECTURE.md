# CL01-dNDVI-S2 — Forest Loss Detection Model Architecture

## Overview

**Model ID:** `CL01-dNDVI-S2`
**Version:** 1.0.0
**Framework:** Pure NumPy + Rasterio (no deep-learning weights; no PyTorch/TensorFlow dependency)
**Mission:** Bi-temporal Sentinel-2 MSI Level-2A surface reflectance change detection for tropical canopy loss

---

## Core Algorithm: Bi-Temporal dNDVI

NDVI_before = (B8_before - B4_before) / (B8_before + B4_before)
NDVI_after  = (B8_after  - B4_after)  / (B8_after  + B4_after)
dNDVI       = NDVI_after - NDVI_before

Pixels with valid baseline canopy (NDVI_before >= 0.40) that exhibit significant negative dNDVI are classified as forest loss candidates.

---

## Classification Thresholds

| Severity   | dNDVI Range      | Description                                    |
|------------|------------------|------------------------------------------------|
| critical   | <= -0.32         | Complete canopy clearance, bare soil exposed   |
| high       | -0.32 to -0.24   | Severe canopy stripping, likely illegal felling|
| moderate   | -0.24 to -0.16   | Partial canopy damage or selective logging     |
| (noise)    | > -0.16          | Sub-threshold -- excluded from output polygons |

---

## SCL Cloud & Shadow Masking

SCL Class 3 (Cloud Shadow), 8 (Cloud Medium), 9 (Cloud High), 10 (Thin Cirrus) -> IEEE NaN

Cloud pixels are NEVER counted as deforestation.

---

## Confidence Score Formula

confidence = spectral_loss_score * canopy_baseline_weight * (1.0 - cloud_risk_penalty)

Confidence values are strictly bounded to [0.0, 1.0]. No fabricated accuracy claims are made.

---

## Output Formats

| Artifact              | Format  | CRS       | Description                              |
|-----------------------|---------|-----------|------------------------------------------|
| change_mask.tif       | GeoTIFF | EPSG:4326 | Binary change mask (1=loss, NaN=masked)  |
| d_ndvi.tif            | GeoTIFF | EPSG:4326 | Continuous dNDVI spectral delta raster   |
| detections.geojson    | GeoJSON | EPSG:4326 | Vector polygons with property metadata   |

---

## Deep Learning Retraining Blueprint

Required before commencing deep-learning training (ChangeFormer / Siamese Swin-UNet):
- 50,000 paired Sentinel-2 L2A image chips (Dynamic World + Hansen GFC ground truth)
- 4x NVIDIA A100 SXM4 80GB (~72 hours per training run, ~350 kWh)
- Spatial K-Fold cross-validation, F1 >= 0.82, IoU >= 0.70 target
