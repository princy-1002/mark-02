"""
CL-01 Backend — Data service layer
Stateless helper functions that apply filters and compute aggregations
over the in-memory fixture store.

NOTE: This intentionally uses in-memory demo fixtures.
A real database / satellite pipeline is NOT yet connected.
"""

from __future__ import annotations

import math
from datetime import date, timedelta
from typing import Optional

from .fixtures import ALERTS, DETECTIONS, REGIONS


# ─── Date filtering helpers ───────────────────────────────────────────────────

def _cutoff_date(date_range: str) -> Optional[date]:
    today = date.today()
    mapping = {"7d": 7, "30d": 30, "90d": 90}
    if date_range == "ytd":
        return date(today.year, 1, 1)
    days = mapping.get(date_range)
    return (today - timedelta(days=days)) if days else None


def _in_date_range(detected_date_str: str, date_range: str, start_date: Optional[str], end_date: Optional[str]) -> bool:
    try:
        det = date.fromisoformat(detected_date_str)
    except ValueError:
        return True  # can't parse, don't filter out

    if start_date and end_date:
        try:
            return date.fromisoformat(start_date) <= det <= date.fromisoformat(end_date)
        except ValueError:
            pass

    cutoff = _cutoff_date(date_range)
    if cutoff:
        return det >= cutoff
    return True


# Dynamic in-memory store for real ML inference detections
_DYNAMIC_DETECTIONS: list[dict] = []
_DYNAMIC_ALERTS: list[dict] = []


def add_real_detections(detections: list[dict]):
    """Add real ML change detection results to active detections store."""
    existing_ids = {d["id"] for d in _DYNAMIC_DETECTIONS} | {d["id"] for d in DETECTIONS}
    for d in detections:
        if d["id"] not in existing_ids:
            _DYNAMIC_DETECTIONS.insert(0, d)
            existing_ids.add(d["id"])


def add_real_alert(alert: dict):
    """Add a real generated alert from ML detection."""
    existing_ids = {a["id"] for a in _DYNAMIC_ALERTS} | {a["id"] for a in ALERTS}
    if alert["id"] not in existing_ids:
        _DYNAMIC_ALERTS.insert(0, alert)


def get_all_detections() -> list[dict]:
    return _DYNAMIC_DETECTIONS + list(DETECTIONS)


def get_all_alerts() -> list[dict]:
    return _DYNAMIC_ALERTS + list(ALERTS)


# ─── Regions ─────────────────────────────────────────────────────────────────

def get_regions():
    return REGIONS


def get_region_by_id(region_id: str):
    return next((r for r in REGIONS if r["id"] == region_id), None)


# ─── Detections ──────────────────────────────────────────────────────────────

def filter_detections(
    region_id: Optional[str] = None,
    severity: Optional[str] = None,
    date_range: str = "30d",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
):
    results = get_all_detections()

    if region_id and region_id != "all":
        results = [d for d in results if d["regionId"] == region_id]

    if severity and severity != "all":
        results = [d for d in results if d["severity"] == severity]

    if search:
        q = search.lower()
        results = [
            d for d in results
            if q in d["name"].lower()
            or q in d["regionName"].lower()
            or q in d.get("stateUT", "").lower()
            or q in d["id"].lower()
        ]

    results = [
        d for d in results
        if _in_date_range(d["detectedDate"], date_range, start_date, end_date)
    ]

    total = len(results)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    paginated = results[start : start + page_size]

    return paginated, total, total_pages


def get_detection_by_id(detection_id: str):
    return next((d for d in get_all_detections() if d["id"] == detection_id), None)


# ─── Analytics ───────────────────────────────────────────────────────────────

def compute_summary(
    region_id: Optional[str] = None,
    severity: Optional[str] = None,
    date_range: str = "30d",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    from .fixtures import ALERTS as _ALERTS

    records, total, _ = filter_detections(
        region_id=region_id,
        severity=severity,
        date_range=date_range,
        start_date=start_date,
        end_date=end_date,
        page=1,
        page_size=9999,
    )

    total_area = sum(d["areaHectares"] for d in records)
    severity_counts: dict = {"critical": 0, "high": 0, "moderate": 0, "low": 0}
    for d in records:
        sev = d.get("severity", "low")
        if sev in severity_counts:
            severity_counts[sev] += 1

    avg_conf = (
        sum(d["confidenceScore"] for d in records) / len(records)
        if records
        else 0.0
    )
    ground_verified = sum(1 for d in records if d.get("isGroundVerified"))

    # Active alerts
    active_alerts = [a for a in _ALERTS if a["status"] == "active"]
    if region_id and region_id != "all":
        active_alerts = [a for a in active_alerts if a["regionId"] == region_id]

    # Region breakdown
    region_map: dict[str, dict] = {}
    for d in records:
        rid = d["regionId"]
        if rid not in region_map:
            region_map[rid] = {"regionId": rid, "regionName": d["regionName"], "count": 0, "areaHa": 0.0}
        region_map[rid]["count"] += 1
        region_map[rid]["areaHa"] += d["areaHectares"]
    region_breakdown = sorted(region_map.values(), key=lambda x: x["areaHa"], reverse=True)

    return {
        "totalDetections": total,
        "totalAreaHa": round(total_area, 2),
        "criticalCount": severity_counts["critical"],
        "highCount": severity_counts["high"],
        "moderateCount": severity_counts["moderate"],
        "lowCount": severity_counts["low"],
        "avgConfidenceScore": round(avg_conf, 4),
        "groundVerifiedCount": ground_verified,
        "activeAlertsCount": len(active_alerts),
        "regionBreakdown": region_breakdown,
        "isDemo": True,
    }


# ─── Alerts ──────────────────────────────────────────────────────────────────

def filter_alerts(
    region_id: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    date_range: str = "30d",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
):
    results = get_all_alerts()

    if region_id and region_id != "all":
        results = [a for a in results if a["regionId"] == region_id]

    if severity and severity != "all":
        results = [a for a in results if a["severity"] == severity]

    if status and status != "all":
        results = [a for a in results if a["status"] == status]

    if search:
        q = search.lower()
        results = [
            a for a in results
            if q in a["eventName"].lower()
            or q in a["regionName"].lower()
            or q in a.get("stateUT", "").lower()
            or q in a["id"].lower()
        ]

    results = [
        a for a in results
        if _in_date_range(a["firstObservationDate"], date_range, start_date, end_date)
    ]

    # summary stats
    summary = {
        "total": len(results),
        "active": sum(1 for a in results if a["status"] == "active"),
        "acknowledged": sum(1 for a in results if a["status"] == "acknowledged"),
        "resolved": sum(1 for a in results if a["status"] == "resolved"),
        "falsePositive": sum(1 for a in results if a["status"] == "false_positive"),
        "highSeverity": sum(1 for a in results if a["severity"] in ("critical", "high")),
    }

    total = len(results)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    paginated = results[start : start + page_size]

    return paginated, total, total_pages, summary


def get_alert_by_id(alert_id: str):
    return next((a for a in get_all_alerts() if a["id"] == alert_id), None)


def patch_alert(alert_id: str, status: str, notes: Optional[str]) -> Optional[dict]:
    """
    In-memory patch for alert records.
    """
    alert = next((a for a in get_all_alerts() if a["id"] == alert_id), None)
    if alert is None:
        return None
    alert["status"] = status
    if notes is not None:
        alert["notes"] = notes
    return alert
