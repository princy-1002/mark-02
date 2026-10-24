# CL-01 Backend API

FastAPI backend for the CL-01 Forest Loss Detection Platform.

---

## Quick Start

```powershell
# From the project root (c:\Users\tryna\MARK 01)
py -m uvicorn backend.main:app --reload --port 8000
```

- **API base**: http://localhost:8000/api
- **Interactive docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

The Vite frontend dev server (`npm run dev`) proxies all `/api/*` requests to port 8000 automatically.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Service health + integration status |
| `GET` | `/api/regions` | All monitored regions |
| `GET` | `/api/regions/{id}` | Single region by ID |
| `GET` | `/api/detections` | Paginated detection records (filters below) |
| `GET` | `/api/detections/{id}` | Single detection record |
| `GET` | `/api/analytics/summary` | Aggregate KPI metrics |
| `GET` | `/api/analytics/trends` | Monthly time-series data |
| `GET` | `/api/alerts` | Paginated alert records |
| `GET` | `/api/alerts/{id}` | Single alert |
| `PATCH` | `/api/alerts/{id}` | Update alert status / notes |
| `GET` | `/api/reports/export` | Download CSV or JSON report |
| `GET` | `/api/satellite/provider-info` | Sentinel-2 provider documentation & auth status |
| `GET` | `/api/satellite/search` | Search real Sentinel-2 scenes by ROI & date range |
| `POST` | `/api/satellite/ingest` | Submit background Sentinel-2 ingestion & preprocessing job |
| `GET` | `/api/satellite/jobs` | List all satellite ingestion jobs |
| `GET` | `/api/satellite/jobs/{id}` | Detailed job status, progress %, and metadata |
| `GET` | `/api/satellite/jobs/{id}/scenes` | Acquired scene metadata for baseline and target periods |
| `GET` | `/api/satellite/jobs/{id}/imagery/{period}/{type}` | Download georeferenced GeoTIFFs or visual PNG previews |
| `GET` | `/api/satellite/jobs/{id}/footprints` | GeoJSON FeatureCollection of ROI and tile footprints |

### Query parameters (detection & alert endpoints)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `regionId` | string | — | Filter by region ID |
| `severity` | string | — | `critical` \| `high` \| `moderate` \| `low` |
| `status` | string | — | (alerts only) `active` \| `acknowledged` \| `resolved` \| `false_positive` |
| `dateRange` | string | `30d` | `7d` \| `30d` \| `90d` \| `ytd` |
| `startDate` | ISO date | — | Overrides `dateRange` when combined with `endDate` |
| `endDate` | ISO date | — | Overrides `dateRange` when combined with `startDate` |
| `search` | string | — | Free-text on name / region / stateUT / ID |
| `page` | int ≥ 1 | 1 | Page number |
| `pageSize` | int 1–100 | 20 | Records per page |

---

## Project Structure

```
backend/
  __init__.py          # Package marker
  main.py              # FastAPI app, all routes, CORS config
  models.py            # Pydantic request/response models
  data_service.py      # Stateless filter + aggregation layer
  fixtures.py          # In-memory demo data (see below)
  tests/
    __init__.py
    test_api.py        # 48 pytest tests covering all endpoints
```

---

## Running Tests

```powershell
py -m pytest backend/tests/ -v
```

All 48 tests should pass in < 2 seconds.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Frontend API base URL |
| `VITE_CESIUM_ION_TOKEN` | (empty) | Optional Cesium Ion token |

Copy `.env.example` → `.env` and fill in values.

---

## Satellite Data Ingestion (CL-01 Part 8)

- **Provider**: Copernicus Data Space Ecosystem (CDSE) / Sentinel-2 L2A via ESA & Element84 Earth Search STAC (AWS Open Data).
- **Authentication**: OAuth2 Client Credentials (`CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET`) or Open STAC access. Credentials are read strictly from backend environment variables and NEVER exposed to frontend or committed to Git.
- **Coverage**: Global land surface (56°S to 84°N), 5-day constellation revisit frequency at equator (2-3 days at mid-latitudes).
- **Spatial Resolution**: 10m (B02, B03, B04, B08), 20m (B05, B06, B07, B8A, B11, B12, SCL), 60m (B01, B09, B10).
- **Request Limits**: 4 concurrent download threads, 10 catalogue requests/sec on free tier.
- **Data Terms**: Creative Commons Attribution 4.0 International (CC BY 4.0) under EU Copernicus Sentinels Free & Open Data Policy.

---

## Current Status & Limitations

| Component | Status | Notes |
|-----------|--------|-------|
| **Data storage** | ❌ Not connected | Detections & alerts served from in-memory fixtures |
| **Satellite ingestion** | ✅ Connected (Part 8) | Sentinel-2 L2A ingestion, SCL cloud masking, GeoTIFF outputs, background jobs |
| **ML inference** | ❌ Not implemented | Planned: Real change detection model on processed rasters |
| **Authentication** | ❌ Not implemented | Required before production deployment |
| **Database** | ❌ Not connected | SQLAlchemy + aiosqlite installed and ready |

---

## Future Integration Points

```python
# backend/data_service.py — replace fixture reads with DB queries:
from .database import SessionLocal
from .orm_models import Detection, Alert

async def filter_detections(...):
    async with SessionLocal() as session:
        query = select(Detection)
        # ... apply filters
        return await session.execute(query)
```

---

> ⚠️ **DEMO MODE**: All data is synthetic. No results represent actual
> evaluated satellite detections. Do not use for regulatory or enforcement purposes.
