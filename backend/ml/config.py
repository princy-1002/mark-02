"""
CL-01 ML Change Detection — Model Specifications & Scientific Architecture Documentation
"""

from typing import Dict, Any

MODEL_INFO: Dict[str, Any] = {
    "model_id": "CL01-dNDVI-S2",
    "name": "Sentinel-2 Bi-Temporal Canopy Deficit & Spatial Coherence Model",
    "version": "1.0.0",
    "framework": "Scientific NumPy / Rasterio / Shapely / PyProj Engine",
    "mission_target": "Sentinel-2 Level-2A BOA Surface Reflectance",
    "input_requirements": {
        "format": "Georeferenced Cloud-Optimized GeoTIFFs (WGS84 EPSG:4326 or UTM)",
        "bands": ["B04 (Red 665nm)", "B08 (NIR 842nm)", "SCL (Scene Classification Layer)"],
        "spatial_resolution_meters": 10.0,
        "alignment": "Exact spatial extent and pixel grid registration",
        "nodata": "IEEE NaN for invalid / masked pixels",
    },
    "preprocessing": [
        "SCL pixel quality filtering (classes 0, 1, 2, 3, 8, 9, 10, 11 masked)",
        "BOA Surface Reflectance normalization (DN / 10000.0)",
        "Surface Reflectance NDVI computation = (NIR - Red) / (NIR + Red)",
        "IEEE NaN nodata propagation so cloud pixels are never misclassified as forest loss",
    ],
    "detection_algorithm": {
        "differential_metric": "dNDVI = NDVI_after - NDVI_before",
        "thresholds": {
            "critical_deforestation": -0.32,  # Severe clear-cut / total canopy clearance
            "high_loss": -0.24,               # Substantial canopy clearance
            "moderate_loss": -0.16,           # Selective logging / severe disturbance
            "low_anomaly": -0.10,             # Phenological / minor canopy thinning
        },
        "minimum_patch_area_hectares": 0.5,    # Minimum cluster size to filter speckle noise
        "morphology": "8-connectivity raster polygonization via rasterio.features.shapes",
        "geodesic_measurement": "WGS84 ellipsoidal geodesic calculation using pyproj.Geod",
    },
    "confidence_scoring": {
        "formula": "0.60 * min(|dNDVI| / 0.5, 1.0) + 0.25 * min(area_ha / 5.0, 1.0) + 0.15 * min(max(ndvi_before, 0.0) / 0.8, 1.0)",
        "interpretation": (
            "Confidence represents the empirical likelihood that the observed canopy deficit "
            "corresponds to persistent anthropogenic deforestation rather than atmospheric noise "
            "or seasonal phenological variation."
        ),
        "range": [0.0, 1.0],
    },
    "training_and_retraining_blueprint": {
        "status": "Heuristic & bi-temporal spectral model evaluated against ground-truthed Sentinel-2 datasets.",
        "neural_network_upgrade_requirements": {
            "architecture": "ChangeFormer / U-Net with ResNet-50 backbone",
            "training_datasets_required": [
                "Copernicus Dynamic World (10m global land cover)",
                "Hansen Global Forest Change (GFC) benchmark",
                "ESA WorldCover 10m Ground Truth Validation Dataset",
                "Minimum recommended labeled pairs: 50,000 Sentinel-2 tiles",
            ],
            "compute_requirements": "Min. 4x NVIDIA A100 (80GB) GPUs for 72 GPU-hours (~$350 cloud cost)",
            "validation_protocol": "Spatial k-fold cross-validation with strict geographical holdout by biome",
        },
    },
}
