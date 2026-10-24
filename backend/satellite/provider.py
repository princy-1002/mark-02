"""
CL-01 Satellite Ingestion — Sentinel-2 Data Provider Client
Queries Copernicus Data Space Ecosystem (CDSE) and AWS Open Data STAC.
"""

from __future__ import annotations
import os
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, date, timezone
import httpx

from .config import get_configured_provider_credentials
from .geometry import validate_geographic_bbox, bbox_to_geojson_polygon

logger = logging.getLogger("satellite_provider")


class ImageryUnavailableError(Exception):
    """Raised when no suitable imagery is found meeting constraints."""
    pass


class SceneMetadata:
    """Standardized metadata container for an acquired Sentinel-2 scene."""
    def __init__(
        self,
        scene_id: str,
        provider: str,
        collection: str,
        platform: str,
        sensing_time: str,
        cloud_cover_pct: float,
        tile_id: str,
        bbox: List[float],
        geometry: Dict[str, Any],
        bands_available: List[str],
        spatial_resolution_m: float,
        assets: Dict[str, Any],
        sun_elevation: Optional[float] = None,
        sun_azimuth: Optional[float] = None,
        crs_epsg: Optional[int] = None,
    ):
        self.scene_id = scene_id
        self.provider = provider
        self.collection = collection
        self.platform = platform  # e.g. "Sentinel-2A" or "Sentinel-2B"
        self.sensing_time = sensing_time
        self.cloud_cover_pct = round(cloud_cover_pct, 2)
        self.tile_id = tile_id
        self.bbox = bbox
        self.geometry = geometry
        self.bands_available = bands_available
        self.spatial_resolution_m = spatial_resolution_m
        self.assets = assets
        self.sun_elevation = sun_elevation
        self.sun_azimuth = sun_azimuth
        self.crs_epsg = crs_epsg or 4326

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id": self.scene_id,
            "provider": self.provider,
            "collection": self.collection,
            "platform": self.platform,
            "sensing_time": self.sensing_time,
            "cloud_cover_pct": self.cloud_cover_pct,
            "tile_id": self.tile_id,
            "bbox": self.bbox,
            "geometry": self.geometry,
            "bands_available": self.bands_available,
            "spatial_resolution_m": self.spatial_resolution_m,
            "assets": {k: {"href": v.get("href")} for k, v in self.assets.items() if isinstance(v, dict)},
            "sun_elevation": self.sun_elevation,
            "sun_azimuth": self.sun_azimuth,
            "crs_epsg": self.crs_epsg,
        }


class Sentinel2Provider:
    """
    Client for searching and selecting Sentinel-2 Level-2A imagery.
    Attempts primary STAC endpoints (CDSE / Earth Search AWS) with credential support.
    """

    CDSE_STAC_URL = "https://stac.dataspace.copernicus.eu/v1/search"
    EARTH_SEARCH_STAC_URL = "https://earth-search.aws.element84.com/v1/search"

    def __init__(self):
        self.credentials = get_configured_provider_credentials()

    def search_scenes(
        self,
        bbox: List[float],
        start_date: str,
        end_date: str,
        max_cloud_cover: float = 20.0,
        limit: int = 10,
    ) -> List[SceneMetadata]:
        """
        Search for Sentinel-2 Level-2A scenes matching bounding box and date range.
        Filters by cloud cover threshold.
        """
        valid_bbox = validate_geographic_bbox(bbox)
        
        # Ensure dates are valid
        s_date = date.fromisoformat(start_date)
        e_date = date.fromisoformat(end_date)
        if s_date > e_date:
            raise ValueError(f"Start date ({start_date}) cannot be after end date ({end_date}).")

        datetime_param = f"{start_date}T00:00:00Z/{end_date}T23:59:59Z"

        # Try Earth Search STAC (open access AWS Sentinel-2 L2A)
        results = self._query_earth_search_stac(valid_bbox, datetime_param, max_cloud_cover, limit)
        if results:
            return results

        # Try CDSE STAC if configured or fallback
        results = self._query_cdse_stac(valid_bbox, datetime_param, max_cloud_cover, limit)
        if results:
            return results

        return []

    def _query_earth_search_stac(
        self,
        bbox: Tuple[float, float, float, float],
        datetime_param: str,
        max_cloud_cover: float,
        limit: int,
    ) -> List[SceneMetadata]:
        """Query Element84 Earth Search STAC API for Sentinel-2 L2A."""
        payload = {
            "collections": ["sentinel-2-l2a", "sentinel-2-c1-l2a"],
            "bbox": list(bbox),
            "datetime": datetime_param,
            "query": {
                "eo:cloud_cover": {"lte": max_cloud_cover}
            },
            "limit": limit,
            "sortby": [{"field": "properties.datetime", "direction": "desc"}]
        }

        try:
            with httpx.Client(timeout=12.0) as client:
                resp = client.post(self.EARTH_SEARCH_STAC_URL, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    features = data.get("features", [])
                    return [self._parse_stac_feature(f, "EarthSearch-AWS") for f in features]
        except Exception as e:
            logger.warning("Earth Search STAC query failed or timed out: %s", e)

        return []

    def _query_cdse_stac(
        self,
        bbox: Tuple[float, float, float, float],
        datetime_param: str,
        max_cloud_cover: float,
        limit: int,
    ) -> List[SceneMetadata]:
        """Query Copernicus Data Space Ecosystem STAC API."""
        headers = {}
        # If API key / Bearer token present
        token = os.getenv("CDSE_ACCESS_TOKEN") or os.getenv("SATELLITE_PROVIDER_API_KEY")
        if token:
            headers["Authorization"] = f"Bearer {token}"

        payload = {
            "collections": ["SENTINEL-2"],
            "bbox": list(bbox),
            "datetime": datetime_param,
            "query": {
                "eo:cloud_cover": {"lte": max_cloud_cover}
            },
            "limit": limit
        }

        try:
            with httpx.Client(timeout=12.0) as client:
                resp = client.post(self.CDSE_STAC_URL, json=payload, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    features = data.get("features", [])
                    return [self._parse_stac_feature(f, "Copernicus-CDSE") for f in features]
        except Exception as e:
            logger.warning("CDSE STAC query failed or timed out: %s", e)

        return []

    def _parse_stac_feature(self, feat: Dict[str, Any], provider_name: str) -> SceneMetadata:
        props = feat.get("properties", {})
        assets = feat.get("assets", {})
        
        # Extract platform (Sentinel-2A or Sentinel-2B)
        platform_raw = props.get("platform", "Sentinel-2")
        if "2a" in platform_raw.lower() or "s2a" in platform_raw.lower():
            platform = "Sentinel-2A"
        elif "2b" in platform_raw.lower() or "s2b" in platform_raw.lower():
            platform = "Sentinel-2B"
        else:
            platform = "Sentinel-2"

        tile_id = (
            props.get("grid:code") or
            props.get("s2:mgrs_tile") or
            props.get("mgrs") or
            f"T{props.get('s2:utm_zone', '43')}{props.get('s2:latitude_band', 'Q')}{props.get('s2:grid_square', 'DA')}"
        )

        cloud_pct = float(props.get("eo:cloud_cover", props.get("cloud_cover", 0.0)))
        sensing_time = props.get("datetime") or props.get("start_datetime") or datetime.now(timezone.utc).isoformat()
        sun_elev = props.get("view:sun_elevation") or props.get("s2:sun_elevation")
        sun_az = props.get("view:sun_azimuth") or props.get("s2:sun_azimuth")

        # Standard bands available in Sentinel-2 L2A
        bands = ["B02", "B03", "B04", "B08", "SCL"]

        return SceneMetadata(
            scene_id=feat.get("id", f"S2_{sensing_time[:10]}"),
            provider=provider_name,
            collection="Sentinel-2-L2A",
            platform=platform,
            sensing_time=sensing_time,
            cloud_cover_pct=cloud_pct,
            tile_id=tile_id,
            bbox=feat.get("bbox", []),
            geometry=feat.get("geometry", {}),
            bands_available=bands,
            spatial_resolution_m=10.0,
            assets=assets,
            sun_elevation=float(sun_elev) if sun_elev is not None else None,
            sun_azimuth=float(sun_az) if sun_az is not None else None,
        )

    def select_optimal_scene(
        self,
        scenes: List[SceneMetadata],
        max_cloud_cover: float,
        target_center_date: Optional[str] = None,
    ) -> SceneMetadata:
        """
        Select the best scene based on lowest cloud cover and proximity to target date.
        """
        suitable = [s for s in scenes if s.cloud_cover_pct <= max_cloud_cover]
        if not suitable:
            raise ImageryUnavailableError(
                f"No Sentinel-2 scene found with cloud cover <= {max_cloud_cover}%. "
                f"Available scenes had cloud cover: {[s.cloud_cover_pct for s in scenes]}%."
            )

        # Sort primarily by cloud cover, then by proximity to target date
        if target_center_date:
            try:
                t_dt = datetime.fromisoformat(target_center_date.replace("Z", ""))
                suitable.sort(
                    key=lambda s: (
                        s.cloud_cover_pct * 0.7 +
                        min(abs((datetime.fromisoformat(s.sensing_time[:10]) - t_dt.replace(tzinfo=None)).days), 60) * 0.3
                    )
                )
            except Exception:
                suitable.sort(key=lambda s: s.cloud_cover_pct)
        else:
            suitable.sort(key=lambda s: s.cloud_cover_pct)

        return suitable[0]
