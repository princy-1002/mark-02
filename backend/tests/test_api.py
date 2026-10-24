"""
CL-01 Backend — Test suite
Run: py -m pytest backend/tests/ -v
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


# ─── Health ───────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_ok(self):
        r = client.get("/api/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["services"]["api"] == "ok"
        assert body["services"]["satellite_ingestion"] in ("connected", "ok", "not_connected")
        assert "disclaimer" in body

    def test_health_response_shape(self):
        r = client.get("/api/health")
        body = r.json()
        for key in ("status", "version", "services", "disclaimer"):
            assert key in body, f"Missing key: {key}"


# ─── Regions ──────────────────────────────────────────────────────────────────

class TestRegions:
    def test_list_regions_returns_200(self):
        r = client.get("/api/regions")
        assert r.status_code == 200

    def test_list_regions_shape(self):
        body = client.get("/api/regions").json()
        assert "data" in body
        assert "total" in body
        assert isinstance(body["data"], list)
        assert body["total"] > 0

    def test_list_regions_has_required_fields(self):
        regions = client.get("/api/regions").json()["data"]
        for region in regions:
            for field in ("id", "name", "country", "biome", "coordinates", "riskRating"):
                assert field in region, f"Region missing field: {field}"

    def test_get_region_by_id_found(self):
        r = client.get("/api/regions/amazon-br")
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == "amazon-br"
        assert "Amazon" in body["name"]

    def test_get_region_not_found_404(self):
        r = client.get("/api/regions/does-not-exist")
        assert r.status_code == 404

    def test_all_region_ids_are_unique(self):
        regions = client.get("/api/regions").json()["data"]
        ids = [r["id"] for r in regions]
        assert len(ids) == len(set(ids))


# ─── Detections ───────────────────────────────────────────────────────────────

class TestDetections:
    def test_list_detections_returns_200(self):
        r = client.get("/api/detections")
        assert r.status_code == 200

    def test_list_detections_shape(self):
        body = client.get("/api/detections").json()
        assert "data" in body
        assert "pagination" in body
        assert "isDemo" in body
        assert body["isDemo"] is True

    def test_pagination_meta(self):
        body = client.get("/api/detections?pageSize=2&page=1").json()
        meta = body["pagination"]
        assert meta["page"] == 1
        assert meta["pageSize"] == 2
        assert len(body["data"]) <= 2
        assert meta["total"] >= 1

    def test_pagination_page_2(self):
        body1 = client.get("/api/detections?pageSize=2&page=1").json()
        body2 = client.get("/api/detections?pageSize=2&page=2").json()
        ids1 = {d["id"] for d in body1["data"]}
        ids2 = {d["id"] for d in body2["data"]}
        # Pages should not overlap (if page 2 has data)
        if ids2:
            assert ids1.isdisjoint(ids2)

    def test_filter_by_region(self):
        body = client.get("/api/detections?regionId=western-ghats").json()
        for d in body["data"]:
            assert d["regionId"] == "western-ghats"

    def test_filter_by_severity_critical(self):
        body = client.get("/api/detections?severity=critical").json()
        for d in body["data"]:
            assert d["severity"] == "critical"

    def test_filter_by_severity_invalid_returns_empty(self):
        body = client.get("/api/detections?severity=unknown_value").json()
        assert body["data"] == []

    def test_search_by_name(self):
        body = client.get("/api/detections?search=wayanad").json()
        assert len(body["data"]) >= 1
        assert any("Wayanad" in d["name"] for d in body["data"])

    def test_get_detection_by_id_found(self):
        r = client.get("/api/detections/DET-IND-WG-041")
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == "DET-IND-WG-041"
        assert body["severity"] == "critical"

    def test_get_detection_not_found_404(self):
        r = client.get("/api/detections/NO-SUCH-ID")
        assert r.status_code == 404

    def test_detection_response_required_fields(self):
        body = client.get("/api/detections/DET-IND-WG-041").json()
        required = ("id", "name", "regionId", "severity", "confidenceScore", "areaHectares", "detectedDate")
        for field in required:
            assert field in body, f"Detection missing field: {field}"

    def test_confidence_score_in_range(self):
        records = client.get("/api/detections").json()["data"]
        for d in records:
            assert 0.0 <= d["confidenceScore"] <= 1.0, f"{d['id']} has invalid confidence"

    def test_page_size_limit(self):
        r = client.get("/api/detections?pageSize=200")
        assert r.status_code == 422  # Exceeds max of 100


# ─── Analytics ────────────────────────────────────────────────────────────────

class TestAnalytics:
    def test_summary_returns_200(self):
        r = client.get("/api/analytics/summary")
        assert r.status_code == 200

    def test_summary_shape(self):
        body = client.get("/api/analytics/summary").json()
        for field in ("totalDetections", "totalAreaHa", "criticalCount", "avgConfidenceScore", "regionBreakdown"):
            assert field in body, f"Summary missing field: {field}"

    def test_summary_counts_consistent(self):
        body = client.get("/api/analytics/summary").json()
        total = body["totalDetections"]
        parts = body["criticalCount"] + body["highCount"] + body["moderateCount"] + body["lowCount"]
        assert parts == total, f"Severity counts don't sum to total: {parts} != {total}"

    def test_summary_avg_confidence_in_range(self):
        body = client.get("/api/analytics/summary").json()
        avg = body["avgConfidenceScore"]
        assert 0.0 <= avg <= 1.0, f"avgConfidenceScore out of range: {avg}"

    def test_summary_total_area_positive(self):
        body = client.get("/api/analytics/summary").json()
        assert body["totalAreaHa"] >= 0

    def test_summary_filter_by_region(self):
        all_body = client.get("/api/analytics/summary").json()
        filtered_body = client.get("/api/analytics/summary?regionId=western-ghats").json()
        # Filtered count cannot exceed all
        assert filtered_body["totalDetections"] <= all_body["totalDetections"]

    def test_trends_returns_200(self):
        r = client.get("/api/analytics/trends")
        assert r.status_code == 200

    def test_trends_shape(self):
        body = client.get("/api/analytics/trends").json()
        assert "data" in body
        assert isinstance(body["data"], list)
        assert len(body["data"]) > 0

    def test_trends_data_fields(self):
        points = client.get("/api/analytics/trends").json()["data"]
        for p in points:
            for field in ("month", "label", "totalDetections", "totalAreaHa", "criticalCount", "avgConfidence"):
                assert field in p, f"Trend point missing field: {field}"


# ─── Alerts ───────────────────────────────────────────────────────────────────

class TestAlerts:
    def test_list_alerts_returns_200(self):
        r = client.get("/api/alerts")
        assert r.status_code == 200

    def test_list_alerts_shape(self):
        body = client.get("/api/alerts").json()
        assert "data" in body
        assert "pagination" in body
        assert "summary" in body

    def test_alerts_summary_stats(self):
        body = client.get("/api/alerts").json()
        summary = body["summary"]
        for key in ("total", "active", "acknowledged", "resolved", "highSeverity"):
            assert key in summary, f"Summary missing key: {key}"

    def test_filter_alerts_by_status(self):
        body = client.get("/api/alerts?status=active").json()
        for a in body["data"]:
            assert a["status"] == "active"

    def test_filter_alerts_by_severity(self):
        body = client.get("/api/alerts?severity=critical").json()
        for a in body["data"]:
            assert a["severity"] == "critical"

    def test_filter_alerts_by_region(self):
        body = client.get("/api/alerts?regionId=amazon-br").json()
        for a in body["data"]:
            assert a["regionId"] == "amazon-br"

    def test_get_alert_by_id_found(self):
        r = client.get("/api/alerts/ALT-001")
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == "ALT-001"

    def test_get_alert_not_found_404(self):
        r = client.get("/api/alerts/ALT-NOSUCH")
        assert r.status_code == 404

    def test_patch_alert_status(self):
        r = client.patch("/api/alerts/ALT-001", json={"status": "acknowledged"})
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "acknowledged"

    def test_patch_alert_with_notes(self):
        r = client.patch("/api/alerts/ALT-003", json={"status": "resolved", "notes": "Field verified — false alarm"})
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "resolved"
        assert body["notes"] == "Field verified — false alarm"

    def test_patch_alert_invalid_status(self):
        r = client.patch("/api/alerts/ALT-001", json={"status": "invalid_status"})
        assert r.status_code == 422

    def test_patch_alert_not_found(self):
        r = client.patch("/api/alerts/ALT-NOSUCH", json={"status": "resolved"})
        assert r.status_code == 404


# ─── Reports / Export ─────────────────────────────────────────────────────────

class TestReports:
    def test_export_json_returns_200(self):
        r = client.get("/api/reports/export?format=json")
        assert r.status_code == 200

    def test_export_json_shape(self):
        body = client.get("/api/reports/export?format=json").json()
        assert "records" in body
        assert "totalRecords" in body
        assert "generatedAt" in body
        assert body["isDemo"] is True

    def test_export_csv_returns_200(self):
        r = client.get("/api/reports/export?format=csv")
        assert r.status_code == 200
        assert "text/csv" in r.headers["content-type"]

    def test_export_csv_has_data(self):
        r = client.get("/api/reports/export?format=csv")
        content = r.content.decode("utf-8-sig")
        assert "CL-01" in content
        assert "DEMO DATA" in content
        # At least one data row beyond the header
        lines = [line for line in content.splitlines() if line and not line.startswith("#")]
        assert len(lines) >= 2  # header row + at least 1 data row

    def test_export_json_filter_by_region(self):
        body = client.get("/api/reports/export?format=json&regionId=amazon-br").json()
        for r in body["records"]:
            assert r["regionId"] == "amazon-br"

    def test_export_invalid_format_422(self):
        r = client.get("/api/reports/export?format=xml")
        assert r.status_code == 422
