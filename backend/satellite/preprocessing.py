"""
CL-01 Satellite Ingestion — Geospatial Preprocessing & Scientific Raster Operations
Uses Rasterio and NumPy for cloud masking, NDVI calculation, and GeoTIFF output creation.
"""

from __future__ import annotations
import os
import math
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
import numpy as np
try:
    import rasterio
    from rasterio.transform import from_bounds
    from rasterio.crs import CRS
    from rasterio.enums import Resampling
    HAS_RASTERIO = True
except (ImportError, Exception):
    rasterio = None
    from_bounds = None
    CRS = None
    Resampling = None
    HAS_RASTERIO = False

from .geometry import validate_geographic_bbox


# Sentinel-2 SCL (Scene Classification Layer) Classes
SCL_NO_DATA = 0
SCL_SATURATED = 1
SCL_CAST_SHADOW = 2
SCL_CLOUD_SHADOW = 3
SCL_VEGETATION = 4
SCL_NOT_VEGETATED = 5
SCL_WATER = 6
SCL_UNCLASSIFIED = 7
SCL_CLOUD_MEDIUM = 8
SCL_CLOUD_HIGH = 9
SCL_THIN_CIRRUS = 10
SCL_SNOW = 11

# Classes to mask out: clouds, shadows, defective pixels, snow
INVALID_SCL_CLASSES = {
    SCL_NO_DATA,
    SCL_SATURATED,
    SCL_CAST_SHADOW,
    SCL_CLOUD_SHADOW,
    SCL_CLOUD_MEDIUM,
    SCL_CLOUD_HIGH,
    SCL_THIN_CIRRUS,
    SCL_SNOW,
}


def create_cloud_mask(scl_array: np.ndarray) -> np.ndarray:
    """
    Generate boolean mask where True indicates invalid pixels
    (clouds, cloud shadows, thin cirrus, snow, or no-data).
    """
    mask = np.isin(scl_array, list(INVALID_SCL_CLASSES))
    return mask


def compute_normalized_difference(band_nir: np.ndarray, band_red: np.ndarray, mask: Optional[np.ndarray] = None) -> np.ndarray:
    """
    Calculate NDVI = (NIR - Red) / (NIR + Red).
    Values are clipped to [-1.0, 1.0].
    Masked pixels and division by zero are set to np.nan.
    """
    # Convert to float32
    nir = band_nir.astype(np.float32)
    red = band_red.astype(np.float32)

    denominator = nir + red
    with np.errstate(divide="ignore", invalid="ignore"):
        ndvi = (nir - red) / denominator
        ndvi[denominator == 0] = np.nan

    ndvi = np.clip(ndvi, -1.0, 1.0)

    if mask is not None:
        ndvi[mask] = np.nan

    return ndvi


def write_geotiff(
    output_path: str,
    data: np.ndarray,
    bbox: Tuple[float, float, float, float],
    crs_epsg: int = 4326,
    nodata: Optional[float] = None,
    band_names: Optional[List[str]] = None,
) -> str:
    """
    Write a 2D or 3D NumPy array to a valid georeferenced GeoTIFF with CRS and Affine transform.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    min_lng, min_lat, max_lng, max_lat = bbox

    if data.ndim == 2:
        count = 1
        height, width = data.shape
        data_to_write = data[np.newaxis, :, :]
    elif data.ndim == 3:
        count, height, width = data.shape
        data_to_write = data
    else:
        raise ValueError(f"Unsupported array dimensions: {data.ndim}. Expected 2 or 3.")

    # Compute affine transform for the bounding box
    transform = from_bounds(min_lng, min_lat, max_lng, max_lat, width, height)
    crs = CRS.from_epsg(crs_epsg)

    dtype = data.dtype
    profile = {
        "driver": "GTiff",
        "height": height,
        "width": width,
        "count": count,
        "dtype": dtype,
        "crs": crs,
        "transform": transform,
        "compress": "deflate",
        "tiled": True,
        "blockxsize": min(256, width),
        "blockysize": min(256, height),
    }

    if nodata is not None:
        profile["nodata"] = nodata

    with rasterio.open(output_path, "w", **profile) as dst:
        dst.write(data_to_write)
        if band_names:
            for idx, name in enumerate(band_names, start=1):
                dst.set_band_description(idx, name)

    return output_path


def generate_synthetic_scene_arrays(
    bbox: Tuple[float, float, float, float],
    height: int = 256,
    width: int = 256,
    base_forest_density: float = 0.85,
    cloud_fraction: float = 0.05,
    is_after_scene: bool = False,
    loss_fraction: float = 0.0,
    seed: int = 42,
) -> Dict[str, np.ndarray]:
    """
    Generates realistic Sentinel-2 Level-2A surface reflectance arrays for an ROI.
    Used when connecting or verifying satellite pipelines locally without blocking on remote multi-GB downloads.
    Produces actual 16-bit surface reflectance bands (B02, B03, B04, B08) and 8-bit SCL mask.
    """
    np.random.seed(seed)
    
    # Base terrain gradient
    y_grad, x_grad = np.mgrid[0:height, 0:width]
    topo_noise = np.sin(x_grad / 20.0) * np.cos(y_grad / 25.0) * 0.15

    # Forest canopy mask (dense vegetation)
    vegetation_base = (np.random.rand(height, width) * 0.2 + base_forest_density + topo_noise).clip(0.1, 0.95)

    if is_after_scene and loss_fraction > 0:
        # Simulate an actual localized logging/clearance area in the center quadrant
        ch, cw = height // 2, width // 2
        rad = int(min(height, width) * loss_fraction * 1.5)
        loss_y, loss_x = np.ogrid[:height, :width]
        dist_from_center = np.sqrt((loss_y - ch)**2 + (loss_x - cw)**2)
        loss_patch = dist_from_center <= rad
        vegetation_base[loss_patch] = np.random.uniform(0.15, 0.28, size=np.sum(loss_patch))

    # Calculate Surface Reflectance (Digital Numbers 0 - 10000, 10000 = 100% reflectance)
    # Healthy forest: High NIR (B08 ~ 4000-6000), Low Red (B04 ~ 300-800), Green (B03 ~ 600-1200), Blue (B02 ~ 300-700)
    # Bare soil / cleared: Higher Red (B04 ~ 2000-3000), Lower NIR (B08 ~ 1500-2500)
    veg = vegetation_base

    b08_nir = (veg * 5200 + (1.0 - veg) * 1800 + np.random.normal(0, 80, (height, width))).clip(200, 10000).astype(np.uint16)
    b04_red = ((1.0 - veg) * 2200 + veg * 450 + np.random.normal(0, 50, (height, width))).clip(100, 10000).astype(np.uint16)
    b03_green = ((1.0 - veg) * 1600 + veg * 850 + np.random.normal(0, 40, (height, width))).clip(150, 10000).astype(np.uint16)
    b02_blue = ((1.0 - veg) * 1100 + veg * 400 + np.random.normal(0, 40, (height, width))).clip(100, 10000).astype(np.uint16)

    # SCL Scene Classification Layer (4: Vegetation, 5: Not vegetated)
    scl = np.where(veg > 0.45, SCL_VEGETATION, SCL_NOT_VEGETATED).astype(np.uint8)

    # Add realistic cloud patch if cloud_fraction > 0
    if cloud_fraction > 0:
        cloud_pixels = int(height * width * cloud_fraction)
        cloud_center_y = int(height * 0.2)
        cloud_center_x = int(width * 0.8)
        cloud_y, cloud_x = np.ogrid[:height, :width]
        cloud_dist = np.sqrt((cloud_y - cloud_center_y)**2 + (cloud_x - cloud_center_x)**2)
        cloud_mask = cloud_dist < np.sqrt(cloud_pixels / np.pi)

        # Clouds reflect brightly in all optical bands
        b02_blue[cloud_mask] = 8500
        b03_green[cloud_mask] = 8800
        b04_red[cloud_mask] = 9000
        b08_nir[cloud_mask] = 9200
        scl[cloud_mask] = SCL_CLOUD_HIGH

        # Cloud shadow nearby
        shadow_y = (cloud_center_y + 12) % height
        shadow_x = (cloud_center_x - 12) % width
        shadow_dist = np.sqrt((cloud_y - shadow_y)**2 + (cloud_x - shadow_x)**2)
        shadow_mask = (shadow_dist < np.sqrt(cloud_pixels / (np.pi * 1.5))) & (~cloud_mask)
        b02_blue[shadow_mask] = (b02_blue[shadow_mask] * 0.35).astype(np.uint16)
        b03_green[shadow_mask] = (b03_green[shadow_mask] * 0.35).astype(np.uint16)
        b04_red[shadow_mask] = (b04_red[shadow_mask] * 0.35).astype(np.uint16)
        b08_nir[shadow_mask] = (b08_nir[shadow_mask] * 0.35).astype(np.uint16)
        scl[shadow_mask] = SCL_CLOUD_SHADOW

    return {
        "B02": b02_blue,
        "B03": b03_green,
        "B04": b04_red,
        "B08": b08_nir,
        "SCL": scl,
    }


import struct
import zlib


def _write_png_file(filepath: str, width: int, height: int, pixels: bytes, has_alpha: bool):
    """
    Write valid PNG file using Python standard library (struct + zlib).
    Does not require PIL or external C libraries.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    color_type = 6 if has_alpha else 2  # 6=RGBA, 2=RGB
    channels = 4 if has_alpha else 3
    stride = width * channels

    # Build scanlines with filter byte 0 (None)
    scanlines = bytearray()
    for y in range(height):
        scanlines.append(0)  # Filter byte None
        start = y * stride
        scanlines.extend(pixels[start : start + stride])

    compressed_idat = zlib.compress(bytes(scanlines), level=6)

    def make_chunk(chunk_type: bytes, data: bytes) -> bytes:
        length = struct.pack(">I", len(data))
        crc = struct.pack(">I", zlib.crc32(chunk_type + data) & 0xFFFFFFFF)
        return length + chunk_type + data + crc

    png_header = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, color_type, 0, 0, 0)
    ihdr = make_chunk(b"IHDR", ihdr_data)
    idat = make_chunk(b"IDAT", compressed_idat)
    iend = make_chunk(b"IEND", b"")

    with open(filepath, "wb") as f:
        f.write(png_header + ihdr + idat + iend)


def rgb_to_preview_png(
    rgb_stack: np.ndarray,
    output_png_path: str,
    percentile_min: float = 2.0,
    percentile_max: float = 98.0,
) -> str:
    """
    Renders an RGB stack (3, H, W) to an 8-bit PNG image with 2%-98% cumulative stretch
    for optimal visual comparison in the web UI.
    """
    c, h, w = rgb_stack.shape
    stretched = np.zeros((h, w, 3), dtype=np.uint8)

    for i in range(3):
        band = rgb_stack[i].astype(np.float32)
        valid = band[band > 0]
        if len(valid) > 0:
            p_low = np.percentile(valid, percentile_min)
            p_high = np.percentile(valid, percentile_max)
            if p_high > p_low:
                norm = ((band - p_low) / (p_high - p_low) * 255.0).clip(0, 255)
            else:
                norm = band.clip(0, 255)
        else:
            norm = band.clip(0, 255)
        stretched[:, :, i] = norm.astype(np.uint8)

    raw_bytes = stretched.tobytes()
    _write_png_file(output_png_path, w, h, raw_bytes, has_alpha=False)
    return output_png_path


def ndvi_to_preview_png(
    ndvi: np.ndarray,
    output_png_path: str,
) -> str:
    """
    Renders NDVI float array [-1, 1] with NaN masked out to a colorized 8-bit PNG:
    - High NDVI (>0.6): Deep Forest Green
    - Moderate NDVI (0.3 - 0.6): Olive / Light Green
    - Low NDVI (0.1 - 0.3): Tan / Bare soil
    - Water (<0): Blue
    - NaN (Clouds/Shadows): Dark transparent/grey
    """
    h, w = ndvi.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)

    # Mask of valid pixels
    valid_mask = ~np.isnan(ndvi)
    val = ndvi.copy()
    val[~valid_mask] = -1.0

    # Color mapping
    # High vegetation
    m_high = valid_mask & (val >= 0.55)
    rgba[m_high, 0] = 16    # R
    rgba[m_high, 1] = 160   # G
    rgba[m_high, 2] = 56    # B
    rgba[m_high, 3] = 255   # A

    # Medium vegetation
    m_med = valid_mask & (val >= 0.35) & (val < 0.55)
    rgba[m_med, 0] = 135
    rgba[m_med, 1] = 195
    rgba[m_med, 2] = 60
    rgba[m_med, 3] = 255

    # Low / Grass / Shrub
    m_low = valid_mask & (val >= 0.15) & (val < 0.35)
    rgba[m_low, 0] = 210
    rgba[m_low, 1] = 180
    rgba[m_low, 2] = 70
    rgba[m_low, 3] = 255

    # Bare ground / cleared
    m_bare = valid_mask & (val >= 0.0) & (val < 0.15)
    rgba[m_bare, 0] = 185
    rgba[m_bare, 1] = 95
    rgba[m_bare, 2] = 45
    rgba[m_bare, 3] = 255

    # Water
    m_water = valid_mask & (val < 0.0)
    rgba[m_water, 0] = 30
    rgba[m_water, 1] = 80
    rgba[m_water, 2] = 180
    rgba[m_water, 3] = 255

    # Cloud masked (NaN)
    m_nan = ~valid_mask
    rgba[m_nan, 0] = 60
    rgba[m_nan, 1] = 60
    rgba[m_nan, 2] = 60
    rgba[m_nan, 3] = 120

    raw_bytes = rgba.tobytes()
    _write_png_file(output_png_path, w, h, raw_bytes, has_alpha=True)
    return output_png_path
