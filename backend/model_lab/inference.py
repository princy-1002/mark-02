"""
CL-01 AI Model Lab — Satellite Forest-Loss Inference Pipeline
"""

from __future__ import annotations
import os
import time
import uuid
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
import numpy as np
from PIL import Image

try:
    import torch
except ImportError:
    torch = None

try:
    import rasterio
    from rasterio.features import shapes
    from shapely.geometry import shape, mapping
except ImportError:
    rasterio = None
    shapes = None
    shape = None
    mapping = None

from .config import INFERENCE_DIR, MAX_INFERENCE_IMAGE_BYTES, ALLOWED_IMAGE_EXTENSIONS
from .schemas import InferenceResultResponse
from .architectures import create_model_instance
from .registry import ModelRegistry


class InferencePipeline:
    """Executes real neural network inference on new satellite imagery."""

    def __init__(self, inference_dir: str = INFERENCE_DIR):
        self.inference_dir = inference_dir
        os.makedirs(self.inference_dir, exist_ok=True)
        self.registry = ModelRegistry()
        self.ensure_sample_test_images()

    def run_inference(
        self,
        image_path: str,
        original_filename: str,
        model_id: str,
        confidence_threshold: float = 0.50
    ) -> InferenceResultResponse:
        """Runs model inference, computing genuine loss mask, overlay, and area stats."""
        start_time = time.time()
        file_size = os.path.getsize(image_path)
        if file_size > MAX_INFERENCE_IMAGE_BYTES:
            raise ValueError(f"Image ({file_size / (1024*1024):.1f} MB) exceeds maximum allowed size ({MAX_INFERENCE_IMAGE_BYTES / (1024*1024):.0f} MB).")

        model_item = self.registry.get_model(model_id)
        if not model_item:
            raise ValueError(f"Selected model '{model_id}' was not found in model registry.")

        if not os.path.exists(model_item.weights_path):
            raise ValueError(f"Model checkpoint weights file does not exist at {model_item.weights_path}.")

        inference_id = f"inf-{uuid.uuid4().hex[:10]}"
        inf_dir = os.path.join(self.inference_dir, inference_id)
        os.makedirs(inf_dir, exist_ok=True)

        # Inspect geospatial metadata if GeoTIFF
        is_georeferenced = False
        crs_str = None
        pixel_width_m = None
        pixel_height_m = None
        transform = None

        ext = os.path.splitext(original_filename)[1].lower()
        if ext in {".tif", ".tiff"} and rasterio is not None:
            try:
                with rasterio.open(image_path) as src:
                    if src.crs:
                        is_georeferenced = True
                        crs_str = str(src.crs)
                        transform = src.transform
                        # Check spatial resolution
                        res_x, res_y = abs(src.res[0]), abs(src.res[1])
                        # If projected (e.g. UTM), units are meters
                        if "utm" in crs_str.lower() or "326" in crs_str or "327" in crs_str:
                            pixel_width_m = res_x
                            pixel_height_m = res_y
                        elif "4326" in crs_str:
                            # 1 degree approx 111,320m at equator
                            pixel_width_m = res_x * 111320.0
                            pixel_height_m = res_y * 111320.0
            except Exception:
                pass

        # Load input image
        with Image.open(image_path) as im:
            orig_rgb = im.convert("RGB")
            orig_w, orig_h = orig_rgb.size
            # Resize for model processing (preserving aspect)
            proc_w = min(orig_w, 384)
            proc_h = min(orig_h, 384)
            # Ensure divisible by 16 for U-Net pooling
            proc_w = (proc_w // 16) * 16 or 192
            proc_h = (proc_h // 16) * 16 or 192

            resized_im = orig_rgb.resize((proc_w, proc_h), Image.Resampling.BILINEAR)
            img_arr = np.array(resized_im, dtype=np.float32) / 255.0

        # Save standard display original
        orig_display_path = os.path.join(inf_dir, "original.png")
        resized_im.save(orig_display_path, "PNG")

        if torch is None:
            raise RuntimeError("PyTorch is required for model inference.")

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = create_model_instance(model_item.architecture, in_channels=3, out_classes=1)

        # Load weights
        state_dict = torch.load(model_item.weights_path, map_location=device)
        model.load_state_dict(state_dict)
        model = model.to(device)
        model.eval()

        # Tensor input (1, 3, H, W)
        input_tensor = torch.from_numpy(img_arr.transpose(2, 0, 1)).unsqueeze(0).to(device)

        with torch.no_grad():
            logits = model(input_tensor)
            probs = torch.sigmoid(logits).squeeze().cpu().numpy()  # (H, W)

        # Binary loss prediction
        loss_binary = (probs >= confidence_threshold).astype(np.uint8)

        total_pixels = int(loss_binary.size)
        loss_pixels = int(np.sum(loss_binary))
        loss_pct = round((loss_pixels / total_pixels) * 100, 2) if total_pixels > 0 else 0.0

        # Mean confidence over detected areas
        if loss_pixels > 0:
            mean_conf = round(float(np.mean(probs[loss_binary == 1])), 3)
        else:
            mean_conf = 0.0

        # Severity breakdown
        crit_count = int(np.sum((loss_binary == 1) & (probs >= 0.80)))
        high_count = int(np.sum((loss_binary == 1) & (probs >= 0.65) & (probs < 0.80)))
        mod_count = int(np.sum((loss_binary == 1) & (probs < 0.65)))

        # Area calculation in hectares if georeferenced
        total_area_ha = None
        forest_loss_ha = None
        if pixel_width_m is not None and pixel_height_m is not None:
            m2_per_pixel = pixel_width_m * pixel_height_m
            total_area_ha = round((total_pixels * m2_per_pixel) / 10000.0, 2)
            forest_loss_ha = round((loss_pixels * m2_per_pixel) / 10000.0, 2)

        # Save Binary Mask PNG (white on black)
        mask_png_path = os.path.join(inf_dir, "loss_mask.png")
        mask_vis = (loss_binary * 255).astype(np.uint8)
        Image.fromarray(mask_vis).save(mask_png_path, "PNG")

        # Create colorized overlay (Red flame alert over original image)
        orig_np = np.array(resized_im)
        overlay_np = orig_np.copy()
        loss_mask_bool = loss_binary == 1

        # Red-tinted overlay for deforestation highlight
        overlay_np[loss_mask_bool, 0] = np.clip(orig_np[loss_mask_bool, 0] * 0.3 + 235 * 0.7, 0, 255)
        overlay_np[loss_mask_bool, 1] = np.clip(orig_np[loss_mask_bool, 1] * 0.3 + 45 * 0.7, 0, 255)
        overlay_np[loss_mask_bool, 2] = np.clip(orig_np[loss_mask_bool, 2] * 0.3 + 45 * 0.7, 0, 255)

        overlay_png_path = os.path.join(inf_dir, "overlay.png")
        Image.fromarray(overlay_np.astype(np.uint8)).save(overlay_png_path, "PNG")

        # GeoJSON extraction if rasterio and shapely available
        geojson_features = None
        if shapes is not None and is_georeferenced and transform is not None:
            try:
                features = []
                for geom, val in shapes(loss_binary, transform=transform):
                    if val == 1:
                        poly = shape(geom)
                        if poly.area > 0:
                            features.append({
                                "type": "Feature",
                                "geometry": mapping(poly),
                                "properties": {
                                    "type": "model_predicted_forest_loss",
                                    "confidence": mean_conf,
                                    "model": model_item.name
                                }
                            })
                if features:
                    geojson_features = {
                        "type": "FeatureCollection",
                        "features": features
                    }
            except Exception:
                pass

        execution_time = round(time.time() - start_time, 3)

        result = InferenceResultResponse(
            inference_id=inference_id,
            model_id=model_item.model_id,
            model_version=model_item.version,
            model_name=model_item.name,
            image_name=original_filename,
            original_image_url=f"/api/model-lab/inference/{inference_id}/original.png",
            mask_image_url=f"/api/model-lab/inference/{inference_id}/loss_mask.png",
            overlay_image_url=f"/api/model-lab/inference/{inference_id}/overlay.png",
            mask_download_url=f"/api/model-lab/inference/{inference_id}/download-mask",
            total_area_ha=total_area_ha,
            total_pixels=total_pixels,
            forest_loss_pixels=loss_pixels,
            forest_loss_pct=loss_pct,
            forest_loss_ha=forest_loss_ha,
            mean_confidence=mean_conf,
            is_georeferenced=is_georeferenced,
            crs=crs_str,
            severity_breakdown={
                "critical": crit_count,
                "high": high_count,
                "moderate": mod_count
            },
            geojson=geojson_features,
            execution_time_sec=execution_time,
            created_at=datetime.now(timezone.utc).isoformat()
        )

        # Save metadata
        with open(os.path.join(inf_dir, "result.json"), "w", encoding="utf-8") as f:
            json.dump(result.model_dump(), f, indent=2)

        return result

    def get_inference_result(self, inference_id: str) -> Optional[InferenceResultResponse]:
        meta_file = os.path.join(self.inference_dir, inference_id, "result.json")
        if not os.path.exists(meta_file):
            return None
        with open(meta_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return InferenceResultResponse(**data)

    def ensure_sample_test_images(self):
        """Creates sample test scenes for instant 1-click test inference."""
        sample_dir = os.path.join(self.inference_dir, "samples")
        os.makedirs(sample_dir, exist_ok=True)

        sample1 = os.path.join(sample_dir, "sample_sentinel2_clearing.png")
        if not os.path.exists(sample1):
            np.random.seed(202)
            h, w = 192, 192
            img_arr = np.zeros((h, w, 3), dtype=np.uint8)
            # Canopy background
            img_arr[..., 0] = np.random.normal(40, 10, (h, w)).clip(15, 80)
            img_arr[..., 1] = np.random.normal(125, 15, (h, w)).clip(75, 175)
            img_arr[..., 2] = np.random.normal(50, 10, (h, w)).clip(20, 95)
            # Deforestation patch in center
            yy, xx = np.ogrid[:h, :w]
            dist = ((yy - 96) ** 2) / (32 ** 2) + ((xx - 96) ** 2) / (48 ** 2)
            scar = dist <= 1.0
            img_arr[scar, 0] = np.random.normal(185, 15, scar.sum()).clip(130, 230)
            img_arr[scar, 1] = np.random.normal(120, 15, scar.sum()).clip(80, 160)
            img_arr[scar, 2] = np.random.normal(65, 10, scar.sum()).clip(35, 100)
            Image.fromarray(img_arr).save(sample1, "PNG")

        sample2 = os.path.join(sample_dir, "sample_amazon_corridor.png")
        if not os.path.exists(sample2):
            np.random.seed(303)
            h, w = 192, 192
            img_arr = np.zeros((h, w, 3), dtype=np.uint8)
            img_arr[..., 0] = np.random.normal(30, 8, (h, w)).clip(10, 70)
            img_arr[..., 1] = np.random.normal(115, 12, (h, w)).clip(65, 160)
            img_arr[..., 2] = np.random.normal(40, 8, (h, w)).clip(15, 85)
            # Road slash corridor
            yy, xx = np.ogrid[:h, :w]
            corridor = np.abs(yy - xx * 0.8 - 20) <= 8
            img_arr[corridor, 0] = 190
            img_arr[corridor, 1] = 135
            img_arr[corridor, 2] = 75
            Image.fromarray(img_arr).save(sample2, "PNG")
