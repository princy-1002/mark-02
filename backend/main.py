"""
CL-01 Forest Loss Detection Platform — FastAPI Backend
=======================================================

Startup:
  cd "c:\\Users\\tryna\\MARK 01"
  py -m uvicorn backend.main:app --reload --port 8000

API base: http://localhost:8000/api
Docs:     http://localhost:8000/docs

NOTE: Satellite ingestion and ML inference are NOT yet connected.
All data is served from in-memory demo fixtures (backend/fixtures.py).
See backend/README.md for integration guide.
"""

from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import Optional, Literal

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    AlertPatchRequest,
    AlertResponse,
    AlertsListResponse,
    AnalyticsSummaryResponse,
    AnalyticsTrendsResponse,
    DetectionResponse,
    DetectionsListResponse,
    HealthResponse,
    PaginationMeta,
    RegionResponse,
    RegionsListResponse,
    ReportExportResponse,
    TrendPoint,
)
from . import data_service
from .fixtures import TREND_DATA

import os
from .satellite import router as satellite_router
from .ml import router as ml_router
from .model_lab import router as model_lab_router

# ─── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CL-01 Forest Loss Detection API",
    description=(
        "REST API for the CL-01 Forest Loss Detection Platform. "
        "Provides detection records, alert management, analytics, report export, "
        "Sentinel-2 satellite data ingestion, and ML bi-temporal change detection."
    ),
    version="0.9.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
configured_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://mark-02.vercel.app",
]
if allowed_origins_env:
    configured_origins.extend([o.strip() for o in allowed_origins_env.split(",") if o.strip()])

is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not is_production else configured_origins,
    allow_origin_regex=r"^https:\/\/(mark-02|cl-01)[a-zA-Z0-9_\-]*\.vercel\.app$" if is_production else None,
    allow_credentials=False if (not is_production or "*" in configured_origins) else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(satellite_router)
app.include_router(ml_router)
app.include_router(model_lab_router)

# ─── Root & System Service Endpoints ──────────────────────────────────────────

@app.get("/", tags=["system"])
def root_service_status():
    """Root service discovery and health metadata."""
    return {
        "service": "CL-01 Environmental Intelligence Platform API",
        "status": "online",
        "version": "0.9.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_check": "/api/health",
        "endpoints": {
            "health": "/health",
            "api_health": "/api/health",
            "api_index": "/api",
            "regions": "/api/regions",
            "detections": "/api/detections",
            "analytics_summary": "/api/analytics/summary",
            "analytics_trends": "/api/analytics/trends",
            "alerts": "/api/alerts",
            "reports_export": "/api/reports/export",
            "satellite_provider_info": "/api/satellite/provider-info",
            "ml_model_info": "/api/ml/model-info",
            "model_lab_info": "/api/model-lab/info",
        },
    }


@app.get("/api", tags=["system"])
@app.get("/api/index", tags=["system"])
def api_index():
    """Index of primary API endpoints."""
    return {
        "service": "CL-01 REST API",
        "status": "ok",
        "version": "0.9.0",
        "endpoints": [
            "/api/health",
            "/api/regions",
            "/api/detections",
            "/api/analytics/summary",
            "/api/analytics/trends",
            "/api/alerts",
            "/api/reports/export",
            "/api/satellite/provider-info",
            "/api/ml/model-info",
            "/api/model-lab/info",
            "/api/model-lab/datasets",
            "/api/model-lab/models",
            "/api/model-lab/jobs",
        ],
    }


@app.get("/health", response_model=HealthResponse, tags=["system"])
@app.get("/api/health", response_model=HealthResponse, tags=["system"])
def health_check():
    """Service health — always returns 200 if the API process is running."""
    return HealthResponse(
        status="ok",
        version="0.9.0",
        services={
            "api": "ok",
            "fixtures": "ok",
            "satellite_ingestion": "connected",
            "ml_inference": "connected",
            "model_lab": "connected",
            "database": "not_connected",
        },
        disclaimer=(
            "CL-01 Sentinel-2 ingestion, ML bi-temporal inference, and AI Model Lab engines connected. "
            "Real change detection polygons, neural network training, and alerts can be processed on demand."
        ),
    )


# ─── Regions ──────────────────────────────────────────────────────────────────

@app.get("/api/regions", response_model=RegionsListResponse, tags=["regions"])
def list_regions():
    """Return all monitored regions."""
    regions = data_service.get_regions()
    return RegionsListResponse(
        data=[RegionResponse(**r) for r in regions],
        total=len(regions),
        isDemo=True,
    )


@app.get("/api/regions/{region_id}", response_model=RegionResponse, tags=["regions"])
def get_region(region_id: str):
    """Return a single region by ID."""
    region = data_service.get_region_by_id(region_id)
    if region is None:
        raise HTTPException(status_code=404, detail=f"Region '{region_id}' not found.")
    return RegionResponse(**region)


# ─── Detections ───────────────────────────────────────────────────────────────

DateRangeQ = Literal["7d", "30d", "90d", "ytd"]


@app.get("/api/detections", response_model=DetectionsListResponse, tags=["detections"])
def list_detections(
    region_id: Optional[str] = Query(None, alias="regionId", description="Filter by region ID"),
    severity: Optional[str] = Query(None, description="Filter by severity: critical|high|moderate|low|all"),
    date_range: DateRangeQ = Query("30d", alias="dateRange", description="Preset date window"),
    start_date: Optional[str] = Query(None, alias="startDate", description="ISO date: YYYY-MM-DD (overrides dateRange)"),
    end_date: Optional[str] = Query(None, alias="endDate", description="ISO date: YYYY-MM-DD (overrides dateRange)"),
    search: Optional[str] = Query(None, description="Free-text search on name, region, stateUT, ID"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, alias="pageSize", ge=1, le=100, description="Records per page"),
):
    """
    Return paginated detection records.

    All filter parameters are optional; omitting them returns the full dataset
    (within the default 30-day window).
    """
    records, total, total_pages = data_service.filter_detections(
        region_id=region_id,
        severity=severity,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        search=search,
        page=page,
        page_size=page_size,
    )
    return DetectionsListResponse(
        data=[DetectionResponse(**r) for r in records],
        pagination=PaginationMeta(page=page, pageSize=page_size, total=total, totalPages=total_pages),
        isDemo=True,
    )


@app.get("/api/detections/{detection_id}", response_model=DetectionResponse, tags=["detections"])
def get_detection(detection_id: str):
    """Return a single detection record by ID."""
    record = data_service.get_detection_by_id(detection_id)
    if record is None:
        raise HTTPException(status_code=404, detail=f"Detection '{detection_id}' not found.")
    return DetectionResponse(**record)


# ─── Analytics ────────────────────────────────────────────────────────────────

@app.get("/api/analytics", tags=["analytics"])
def analytics_index():
    """Index of analytics endpoints."""
    return {
        "module": "Analytics & Trends",
        "status": "ready",
        "endpoints": {
            "summary": "/api/analytics/summary",
            "trends": "/api/analytics/trends",
        },
    }


@app.get("/api/analytics/summary", response_model=AnalyticsSummaryResponse, tags=["analytics"])
def analytics_summary(
    region_id: Optional[str] = Query(None, alias="regionId"),
    severity: Optional[str] = Query(None),
    date_range: DateRangeQ = Query("30d", alias="dateRange"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
):
    """Aggregate metrics computed from filtered detection records."""
    summary = data_service.compute_summary(
        region_id=region_id,
        severity=severity,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
    )
    return AnalyticsSummaryResponse(**summary)


@app.get("/api/analytics/trends", response_model=AnalyticsTrendsResponse, tags=["analytics"])
def analytics_trends():
    """
    Monthly time-series aggregation for trend charts.

    NOTE: Currently returns fixed 6-month demo fixture.
    Will be replaced by real aggregated pipeline data.
    """
    return AnalyticsTrendsResponse(
        data=[TrendPoint(**p) for p in TREND_DATA],
        isDemo=True,
    )


# ─── Alerts ───────────────────────────────────────────────────────────────────

@app.get("/api/alerts", response_model=AlertsListResponse, tags=["alerts"])
def list_alerts(
    region_id: Optional[str] = Query(None, alias="regionId"),
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_range: DateRangeQ = Query("30d", alias="dateRange"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, alias="pageSize", ge=1, le=100),
):
    """Return filtered and paginated alert records with summary stats."""
    records, total, total_pages, summary = data_service.filter_alerts(
        region_id=region_id,
        severity=severity,
        status=status,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        search=search,
        page=page,
        page_size=page_size,
    )
    return AlertsListResponse(
        data=[AlertResponse(**r) for r in records],
        pagination=PaginationMeta(page=page, pageSize=page_size, total=total, totalPages=total_pages),
        summary=summary,
        isDemo=True,
    )


@app.get("/api/alerts/{alert_id}", response_model=AlertResponse, tags=["alerts"])
def get_alert(alert_id: str):
    """Return a single alert by ID."""
    alert = data_service.get_alert_by_id(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")
    return AlertResponse(**alert)


@app.patch("/api/alerts/{alert_id}", response_model=AlertResponse, tags=["alerts"])
def update_alert_status(alert_id: str, body: AlertPatchRequest):
    """
    Update the review status of an alert.

    Permitted status transitions:
      active → acknowledged → resolved | false_positive
    """
    alert = data_service.get_alert_by_id(alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")

    updated = data_service.patch_alert(alert_id, body.status, body.notes)
    return AlertResponse(**updated)


# ─── Reports / Export ─────────────────────────────────────────────────────────

@app.get("/api/reports", tags=["reports"])
def reports_index():
    """Index of report export endpoints."""
    return {
        "module": "Compliance Reports & Data Export",
        "status": "ready",
        "endpoints": {
            "export_json": "/api/reports/export?format=json",
            "export_csv": "/api/reports/export?format=csv",
        },
    }


@app.get("/api/reports/export", tags=["reports"])
def export_report(
    format: Literal["json", "csv"] = Query("json", description="Export format: json|csv"),
    region_id: Optional[str] = Query(None, alias="regionId"),
    severity: Optional[str] = Query(None),
    date_range: DateRangeQ = Query("30d", alias="dateRange"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
):
    """
    Generate a structured report export.

    Supports JSON (with envelope metadata) and RFC 4180-compliant CSV.
    Pagination is disabled for exports — all matching records are returned.
    """
    records, total, _ = data_service.filter_detections(
        region_id=region_id,
        severity=severity,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        page=1,
        page_size=9999,
    )
    generated_at = datetime.now(timezone.utc).isoformat()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_ALL)

        # Metadata header (RFC 4180 comment convention)
        writer.writerow(["# CL-01 Forest Loss Detection Platform — Detection Export"])
        writer.writerow(["# Generated", generated_at])
        writer.writerow(["# Region Filter", region_id or "all"])
        writer.writerow(["# Severity Filter", severity or "all"])
        writer.writerow(["# Date Range", date_range])
        writer.writerow(["# Total Records", total])
        writer.writerow(["# DEMO DATA — Not for regulatory use"])
        writer.writerow([])

        # Column headers
        writer.writerow([
            "ID", "Name", "Region", "State/UT", "Detected Date", "Baseline Date",
            "Area (ha)", "Canopy Loss %", "Severity", "Confidence", "Classification",
            "Ground Verified", "Primary Driver", "Sensor", "NDVI Before", "NDVI After", "NDVI Delta",
            "Lat", "Lng",
        ])

        for r in records:
            coords = r.get("coordinates", {})
            writer.writerow([
                r["id"], r["name"], r["regionName"], r.get("stateUT", ""),
                r["detectedDate"], r["baselineDate"],
                r["areaHectares"], r["canopyLossPct"],
                r["severity"], r["confidenceScore"], r["classification"],
                "Yes" if r.get("isGroundVerified") else "No",
                r["primaryDriver"], r["sensor"],
                r.get("ndviBefore", ""), r.get("ndviAfter", ""), r.get("ndviDelta", ""),
                coords.get("lat", ""), coords.get("lng", ""),
            ])

        csv_bytes = output.getvalue().encode("utf-8-sig")  # BOM for Excel compatibility
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="cl01_report_{generated_at[:10]}.csv"'},
        )

    # JSON export
    payload = ReportExportResponse(
        format="json",
        regionId=region_id or "all",
        dateRange=date_range,
        severity=severity or "all",
        totalRecords=total,
        generatedAt=generated_at,
        isDemo=True,
        records=[DetectionResponse(**r) for r in records],
    )
    return payload
