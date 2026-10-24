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

## Current Limitations (intentional)

| Component | Status | Notes |
|-----------|--------|-------|
| **Data storage** | ❌ Not connected | All records served from `backend/fixtures.py` in-memory |
| **Satellite ingestion** | ❌ Not implemented | Planned: Sentinel-2 / Landsat GEE pipeline |
| **ML inference** | ❌ Not implemented | Planned: NDVI change detection model |
| **Authentication** | ❌ Not implemented | Required before any production deployment |
| **Database** | ❌ Not connected | SQLAlchemy + aiosqlite are installed and ready |

When the satellite pipeline is connected:
1. Replace `backend/fixtures.py` calls in `data_service.py` with real DB queries.
2. The API contract (routes, models, filters) does **not** need to change.

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
