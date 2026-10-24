"""
CL-01 API — Pydantic response models
"""

from __future__ import annotations
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ─── Shared primitives ────────────────────────────────────────────────────────

class Coordinates(BaseModel):
    lat: float
    lng: float


# ─── Regions ──────────────────────────────────────────────────────────────────

class RegionResponse(BaseModel):
    id: str
    name: str
    country: str
    biome: str
    coordinates: Coordinates
    totalAreaHectares: float
    monitoredCanopyHectares: float
    canopyDensityPct: float
    riskRating: Literal["High", "Severe", "Moderate"]
    lastSatellitePass: str


class RegionsListResponse(BaseModel):
    data: List[RegionResponse]
    total: int
    isDemo: bool = True


# ─── Detections ───────────────────────────────────────────────────────────────

SeverityLevel = Literal["critical", "high", "moderate", "low"]


class DetectionResponse(BaseModel):
    id: str
    name: str
    regionId: str
    regionName: str
    stateUT: str
    coordinates: Coordinates
    areaHectares: float
    canopyLossPct: float
    severity: SeverityLevel
    confidenceScore: float
    classification: str
    isGroundVerified: bool
    baselineDate: str
    detectedDate: str
    sensor: str
    ndviBefore: Optional[float] = None
    ndviAfter: Optional[float] = None
    ndviDelta: Optional[float] = None
    primaryDriver: str
    evidenceSummary: str
    fieldVerificationNotes: Optional[str] = None


class PaginationMeta(BaseModel):
    page: int
    pageSize: int
    total: int
    totalPages: int


class DetectionsListResponse(BaseModel):
    data: List[DetectionResponse]
    pagination: PaginationMeta
    isDemo: bool = True


# ─── Analytics ────────────────────────────────────────────────────────────────

class AnalyticsSummaryResponse(BaseModel):
    totalDetections: int
    totalAreaHa: float
    criticalCount: int
    highCount: int
    moderateCount: int
    lowCount: int
    avgConfidenceScore: float
    groundVerifiedCount: int
    activeAlertsCount: int
    regionBreakdown: List[dict]
    isDemo: bool = True


class TrendPoint(BaseModel):
    month: str
    label: str
    totalDetections: int
    totalAreaHa: float
    criticalCount: int
    avgConfidence: float


class AnalyticsTrendsResponse(BaseModel):
    data: List[TrendPoint]
    isDemo: bool = True


# ─── Alerts ───────────────────────────────────────────────────────────────────

AlertStatus = Literal["active", "acknowledged", "resolved", "false_positive"]
AlertSeverity = Literal["critical", "high", "moderate", "low"]


class AlertResponse(BaseModel):
    id: str
    eventId: str
    eventName: str
    regionId: str
    regionName: str
    stateUT: str
    severity: AlertSeverity
    status: AlertStatus
    outcome: str
    estimatedAreaHa: Optional[float] = None
    firstObservationDate: str
    generatedAt: str
    acknowledgedAt: Optional[str] = None
    resolvedAt: Optional[str] = None
    confidence: Optional[float] = None
    isDuplicate: bool
    parentAlertId: Optional[str] = None
    notificationChannels: List[str]
    notes: Optional[str] = None


class AlertsListResponse(BaseModel):
    data: List[AlertResponse]
    pagination: PaginationMeta
    summary: dict
    isDemo: bool = True


class AlertPatchRequest(BaseModel):
    status: AlertStatus
    notes: Optional[str] = None


# ─── Reports / Export ─────────────────────────────────────────────────────────

class ReportExportResponse(BaseModel):
    format: str
    regionId: str
    dateRange: str
    severity: str
    totalRecords: int
    generatedAt: str
    isDemo: bool = True
    records: List[DetectionResponse]


# ─── Health ───────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    services: dict
    disclaimer: str


# ─── Error ────────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    status_code: int
