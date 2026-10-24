"""
CL-01 Satellite Ingestion — Geographic Geometry and CRS Validation
"""

from __future__ import annotations
from typing import Dict, Any, List, Tuple, Optional, Union
import math
from shapely.geometry import shape, Polygon, MultiPolygon, box
from shapely.validation import explain_validity


class GeometryValidationError(Exception):
    """Raised when submitted geometry or coordinates are invalid."""
    pass


def validate_geographic_bbox(bbox: List[float]) -> Tuple[float, float, float, float]:
    """
    Validate a geographic bounding box [min_lng, min_lat, max_lng, max_lat].
    Must be in WGS84 (EPSG:4326) coordinates:
      -180 <= lng <= 180
      -90 <= lat <= 90
      min_lng < max_lng (or across anti-meridian)
      min_lat < max_lat
    """
    if not isinstance(bbox, (list, tuple)) or len(bbox) != 4:
        raise GeometryValidationError("Bounding box must be an array of 4 numbers: [min_lng, min_lat, max_lng, max_lat].")

    min_lng, min_lat, max_lng, max_lat = [float(v) for v in bbox]

    if not (-180.0 <= min_lng <= 180.0 and -180.0 <= max_lng <= 180.0):
        raise GeometryValidationError(f"Longitude values [{min_lng}, {max_lng}] must be within [-180, 180] (EPSG:4326).")

    if not (-90.0 <= min_lat <= 90.0 and -90.0 <= max_lat <= 90.0):
        raise GeometryValidationError(f"Latitude values [{min_lat}, {max_lat}] must be within [-90, 90] (EPSG:4326).")

    if min_lat >= max_lat:
        raise GeometryValidationError(f"min_lat ({min_lat}) must be strictly less than max_lat ({max_lat}).")

    if min_lng >= max_lng:
        raise GeometryValidationError(f"min_lng ({min_lng}) must be strictly less than max_lng ({max_lng}).")

    # Sanity check: prevent gigantic whole-world requests that would overwhelm processing
    width = max_lng - min_lng
    height = max_lat - min_lat
    if width > 10.0 or height > 10.0:
        raise GeometryValidationError(
            f"Region of interest bbox ({width:.2f}° x {height:.2f}°) exceeds maximum single-job acquisition threshold of 10° x 10°."
        )

    return (min_lng, min_lat, max_lng, max_lat)


def validate_geojson_geometry(geom_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate a GeoJSON geometry object (Polygon or MultiPolygon).
    Verifies coordinates are valid WGS84 EPSG:4326, geometry is non-empty and topologically valid.
    Returns normalized GeoJSON dict.
    """
    if not isinstance(geom_dict, dict):
        raise GeometryValidationError("Geometry must be a GeoJSON object with 'type' and 'coordinates'.")

    geom_type = geom_dict.get("type")
    if geom_type not in ("Polygon", "MultiPolygon"):
        raise GeometryValidationError(f"Unsupported geometry type '{geom_type}'. Only 'Polygon' and 'MultiPolygon' are supported.")

    try:
        geom_obj = shape(geom_dict)
    except Exception as e:
        raise GeometryValidationError(f"Could not parse GeoJSON geometry: {str(e)}")

    if not geom_obj.is_valid:
        reason = explain_validity(geom_obj)
        raise GeometryValidationError(f"Invalid polygon topology: {reason}")

    if geom_obj.is_empty:
        raise GeometryValidationError("Geometry is empty.")

    min_lng, min_lat, max_lng, max_lat = geom_obj.bounds
    validate_geographic_bbox([min_lng, min_lat, max_lng, max_lat])

    return geom_dict


def bbox_to_geojson_polygon(bbox: Tuple[float, float, float, float]) -> Dict[str, Any]:
    """Convert [min_lng, min_lat, max_lng, max_lat] to GeoJSON Polygon dictionary."""
    min_lng, min_lat, max_lng, max_lat = bbox
    return {
        "type": "Polygon",
        "coordinates": [[
            [min_lng, min_lat],
            [max_lng, min_lat],
            [max_lng, max_lat],
            [min_lng, max_lat],
            [min_lng, min_lat],
        ]],
    }


def get_utm_epsg_for_latlng(lat: float, lng: float) -> int:
    """
    Determine the EPSG code for the UTM zone at a given WGS-84 coordinate.
    Sentinel-2 tiles are projected in native UTM WGS84 (EPSG:32601-32660 for North, 32701-32760 for South).
    """
    zone_number = int(math.floor((lng + 180) / 6) + 1)
    if lat >= 0:
        return 32600 + zone_number
    else:
        return 32700 + zone_number
