"""
CL-01 Backend — Connectivity, Routing, and CORS Automated Tests
Verifies fixes for Error 1 ({"detail":"Not Found"}) and Error 2 (Backend Service Unavailable).
"""

from __future__ import annotations

import io
import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


class TestConnectivityAndRootEndpoints:
    """Verifies service discovery, root routing, and health checks."""

    def test_app_import_and_metadata(self):
        """FastAPI application imports successfully with correct title & version."""
        assert app is not None
        assert app.title == "CL-01 Forest Loss Detection API"
        assert app.version == "0.9.0"

    def test_root_discovery_returns_200(self):
        """GET / returns service discovery metadata and online status."""
        r = client.get("/")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "online"
        assert body["service"] == "CL-01 Environmental Intelligence Platform API"
        assert "endpoints" in body
        assert body["endpoints"]["health"] == "/health"
        assert body["endpoints"]["api_health"] == "/api/health"

    def test_health_endpoint_returns_200(self):
        """GET /health (standard container & cloud platform health check) returns 200."""
        r = client.get("/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["version"] == "0.9.0"
        assert "api" in body["services"]
        assert body["services"]["api"] == "ok"

    def test_api_health_endpoint_returns_200(self):
        """GET /api/health (frontend health check) returns 200."""
        r = client.get("/api/health")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"

    def test_api_index_returns_200(self):
        """GET /api returns endpoint directory."""
        r = client.get("/api")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert "/api/health" in body["endpoints"]
        assert "/api/regions" in body["endpoints"]
        assert "/api/detections" in body["endpoints"]


class TestSubsystemIndexEndpoints:
    """Verifies router prefix root endpoints are registered and do not return 404."""

    def test_analytics_index(self):
        r = client.get("/api/analytics")
        assert r.status_code == 200
        assert r.json()["status"] == "ready"

    def test_reports_index(self):
        r = client.get("/api/reports")
        assert r.status_code == 200
        assert r.json()["status"] == "ready"

    def test_satellite_root(self):
        r = client.get("/api/satellite")
        assert r.status_code == 200
        assert r.json()["status"] == "ready"

    def test_ml_root(self):
        r = client.get("/api/ml")
        assert r.status_code == 200
        assert r.json()["status"] == "ready"

    def test_model_lab_root(self):
        r = client.get("/api/model-lab")
        assert r.status_code == 200
        assert r.json()["status"] == "ready"


class TestNotFoundAndMethodHandling:
    """Verifies correct 404 / 405 behavior without masked errors."""

    def test_unknown_root_route_returns_404(self):
        r = client.get("/this-route-does-not-exist-at-all")
        assert r.status_code == 404
        assert r.json() == {"detail": "Not Found"}

    def test_unknown_api_route_returns_404(self):
        r = client.get("/api/unknown-service-endpoint")
        assert r.status_code == 404
        assert r.json() == {"detail": "Not Found"}

    def test_post_to_get_only_health_returns_405(self):
        r = client.post("/health")
        assert r.status_code == 405

    def test_post_to_get_only_regions_returns_405(self):
        r = client.post("/api/regions")
        assert r.status_code == 405


class TestCorsBehavior:
    """Verifies CORS headers for development and production Vercel origins."""

    def test_cors_preflight_localhost_permitted(self):
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        }
        r = client.options("/api/health", headers=headers)
        assert r.status_code == 200
        assert "access-control-allow-origin" in r.headers

    def test_cors_preflight_production_vercel_permitted(self):
        headers = {
            "Origin": "https://mark-02.vercel.app",
            "Access-Control-Request-Method": "GET",
        }
        r = client.options("/api/health", headers=headers)
        assert r.status_code == 200
        allow_origin = r.headers.get("access-control-allow-origin")
        assert allow_origin in ("https://mark-02.vercel.app", "*")

    def test_cors_preflight_preview_vercel_permitted(self):
        headers = {
            "Origin": "https://mark-02-git-main-princy.vercel.app",
            "Access-Control-Request-Method": "POST",
        }
        r = client.options("/api/satellite/ingest", headers=headers)
        assert r.status_code == 200


class TestRequestValidation:
    """Verifies input validation handling."""

    def test_invalid_page_size_returns_422(self):
        r = client.get("/api/detections?pageSize=500")
        assert r.status_code == 422
        body = r.json()
        assert "detail" in body

    def test_invalid_alert_patch_body_returns_422(self):
        r = client.patch("/api/alerts/ALT-001", json={"status": "invalid_status_enum"})
        assert r.status_code == 422

    def test_upload_non_zip_dataset_returns_400(self):
        fake_txt = io.BytesIO(b"not a zip file")
        files = {"file": ("dataset.txt", fake_txt, "text/plain")}
        r = client.post("/api/model-lab/datasets/upload", files=files)
        assert r.status_code == 400
        assert ".zip" in r.json()["detail"]


class TestRealApplicationEndpointsSmoke:
    """Verifies that all core functional application endpoints respond with valid schemas."""

    def test_regions_endpoint(self):
        r = client.get("/api/regions")
        assert r.status_code == 200
        body = r.json()
        assert len(body["data"]) > 0

    def test_detections_endpoint(self):
        r = client.get("/api/detections?pageSize=5")
        assert r.status_code == 200
        body = r.json()
        assert len(body["data"]) > 0
        assert body["pagination"]["pageSize"] == 5

    def test_alerts_endpoint(self):
        r = client.get("/api/alerts?pageSize=5")
        assert r.status_code == 200
        body = r.json()
        assert "summary" in body
        assert body["summary"]["total"] > 0

    def test_analytics_summary_endpoint(self):
        r = client.get("/api/analytics/summary")
        assert r.status_code == 200
        body = r.json()
        assert body["totalDetections"] > 0

    def test_satellite_provider_info(self):
        r = client.get("/api/satellite/provider-info")
        assert r.status_code == 200
        body = r.json()
        assert "documentation" in body

    def test_ml_model_info(self):
        r = client.get("/api/ml/model-info")
        assert r.status_code == 200
        body = r.json()
        assert "model_architecture" in body

    def test_model_lab_info(self):
        r = client.get("/api/model-lab/info")
        assert r.status_code == 200
        body = r.json()
        assert "compute_device" in body
        assert "available_architectures" in body
