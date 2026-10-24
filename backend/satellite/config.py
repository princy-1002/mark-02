"""
CL-01 Satellite Ingestion — Provider Configuration and Documentation
"""

import os
from typing import Dict, Any

# Provider specifications
PROVIDER_DOCS: Dict[str, Any] = {
    "provider_name": "Copernicus Data Space Ecosystem (CDSE) / Sentinel-2 L2A",
    "mission": "Sentinel-2 MSI (Multi-Spectral Instrument)",
    "product_type": "Level-2A (Bottom-of-Atmosphere / Surface Reflectance)",
    "coverage": {
        "spatial": "Global land surface between 56° South and 84° North",
        "temporal": "June 2015 – Present (Sentinel-2A launched 2015, Sentinel-2B 2017, Sentinel-2C 2024)",
        "revisit_frequency": "5 days at equator (2-3 days at mid-latitudes with constellation)",
    },
    "spatial_resolution": {
        "10m": ["B02 (Blue)", "B03 (Green)", "B04 (Red)", "B08 (NIR)"],
        "20m": ["B05", "B06", "B07 (RedEdge)", "B8A (Narrow NIR)", "B11 (SWIR-1)", "B12 (SWIR-2)", "SCL (Scene Classification)"],
        "60m": ["B01 (Coastal Aerosol)", "B09 (Water Vapour)", "B10 (Cirrus)"],
    },
    "authentication": {
        "mechanism": "OAuth2 Client Credentials / Bearer Token or Open STAC Access",
        "token_endpoint": "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
        "odata_endpoint": "https://catalogue.dataspace.copernicus.eu/odata/v1/Products",
        "stac_endpoint": "https://stac.dataspace.copernicus.eu/v1/",
        "open_stac_fallback": "https://earth-search.aws.element84.com/v1",
        "env_variables": [
            "CDSE_CLIENT_ID",
            "CDSE_CLIENT_SECRET",
            "CDSE_USERNAME",
            "CDSE_PASSWORD",
            "SATELLITE_PROVIDER_API_KEY",
        ],
    },
    "request_limits": {
        "free_tier_concurrency": "4 concurrent download threads",
        "catalogue_query_rate": "10 requests/second",
        "monthly_quota": "Open access with Fair Use Policy (EU Copernicus Program)",
    },
    "data_terms": {
        "license": "Creative Commons Attribution 4.0 International (CC BY 4.0) / EU Copernicus Free and Open Data Policy",
        "attribution_required": "Contains modified Copernicus Sentinel data [year] processed by ESA / CL-01",
        "commercial_use_allowed": True,
        "derivative_works_allowed": True,
    },
}


def get_configured_provider_credentials() -> Dict[str, Any]:
    """
    Read credentials ONLY from backend environment variables.
    Never commit or expose secrets.
    """
    client_id = os.getenv("CDSE_CLIENT_ID")
    client_secret = os.getenv("CDSE_CLIENT_SECRET")
    username = os.getenv("CDSE_USERNAME")
    password = os.getenv("CDSE_PASSWORD")
    api_key = os.getenv("SATELLITE_PROVIDER_API_KEY")

    has_cdse_oauth = bool(client_id and client_secret)
    has_cdse_user = bool(username and password)
    has_api_key = bool(api_key)

    is_authenticated = has_cdse_oauth or has_cdse_user or has_api_key

    return {
        "is_authenticated": is_authenticated,
        "auth_method": "cdse_oauth" if has_cdse_oauth else ("cdse_credentials" if has_cdse_user else ("api_key" if has_api_key else "open_stac_anonymous")),
        "has_cdse_oauth": has_cdse_oauth,
        "has_cdse_user": has_cdse_user,
        "has_api_key": has_api_key,
        # Intentionally do NOT include actual secret values
    }
