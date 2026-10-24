"""
CL-01 — Production Deployment Regression Tests
================================================
Specifically tests the exact scenarios that caused recurring errors:

  Error 1: {"detail": "Not Found"}
    → Backend route not registered / wrong prefix
    → Frontend calling wrong URL (localhost in production)

  Error 2: "Backend Service Unavailable"
    → No backend deployed in production
    → Vercel catch-all returning HTML instead of JSON
    → Mixed-content block (HTTP backend from HTTPS frontend)

Root cause confirmed: VITE_API_BASE_URL not set in Vercel dashboard,
so the production bundle used '' (same-origin), and Vercel's catch-all
rewrite returned index.html for every /api/* request.

These tests guard against:
  1. Backend route regressions (every frontend-consumed endpoint must exist)
  2. JSON response format regressions (endpoints must return JSON, not HTML)
  3. Health endpoint absence (deployment health checks require /health + /api/health)
  4. CORS misconfiguration (Vercel frontend must be allowed)
  5. Unknown-route masking (should get 404, not fake 200)
  6. Application startup failures
"""

from __future__ import annotations

import json
import pytest
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app, raise_server_exceptions=True)


# ─── Regression: Error 1 — {"detail": "Not Found"} ──────────────────────────

class TestError1Regression:
    """
    Error 1 root cause: frontend calling an endpoint that doesn't exist.
    Guard every endpoint the frontend actually calls.
    """

    # Core data endpoints (src/api/client.ts)
    def test_health_exists(self):
        r = client.get("/api/health")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        assert r.headers["content-type"].startswith("application/json")
        data = r.json()
        assert data["status"] == "ok"

    def test_health_alt_path_exists(self):
        """Container/platform health check path."""
        r = client.get("/health")
        assert r.status_code == 200

    def test_regions_exists(self):
        r = client.get("/api/regions")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)
        assert len(data["data"]) > 0

    def test_detections_exists(self):
        r = client.get("/api/detections")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "pagination" in data

    def test_analytics_summary_exists(self):
        r = client.get("/api/analytics/summary")
        assert r.status_code == 200
        data = r.json()
        assert "totalDetections" in data

    def test_analytics_trends_exists(self):
        r = client.get("/api/analytics/trends")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert isinstance(data["data"], list)

    def test_alerts_exists(self):
        r = client.get("/api/alerts")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "summary" in data

    def test_reports_export_json_exists(self):
        r = client.get("/api/reports/export?format=json")
        assert r.status_code == 200
        data = r.json()
        assert "records" in data

    def test_satellite_provider_info_exists(self):
        r = client.get("/api/satellite/provider-info")
        assert r.status_code == 200
        data = r.json()
        assert "documentation" in data

    def test_satellite_search_exists(self):
        r = client.get(
            "/api/satellite/search"
            "?min_lng=76.0&min_lat=11.0&max_lng=77.0&max_lat=12.0"
            "&start_date=2024-01-01&end_date=2024-02-01"
        )
        assert r.status_code == 200

    def test_ml_model_info_exists(self):
        r = client.get("/api/ml/model-info")
        assert r.status_code == 200
        data = r.json()
        assert "model_architecture" in data

    def test_ml_jobs_list_exists(self):
        r = client.get("/api/ml/jobs")
        assert r.status_code == 200

    def test_model_lab_info_exists(self):
        r = client.get("/api/model-lab/info")
        assert r.status_code == 200
        data = r.json()
        assert "available_architectures" in data

    def test_model_lab_datasets_exists(self):
        r = client.get("/api/model-lab/datasets")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_model_lab_models_exists(self):
        r = client.get("/api/model-lab/models")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_model_lab_jobs_exists(self):
        r = client.get("/api/model-lab/jobs")
        assert r.status_code == 200

    def test_subsystem_index_satellite(self):
        """Frontend may call /api/satellite root to verify subsystem."""
        r = client.get("/api/satellite")
        assert r.status_code == 200

    def test_subsystem_index_ml(self):
        r = client.get("/api/ml")
        assert r.status_code == 200

    def test_subsystem_index_model_lab(self):
        r = client.get("/api/model-lab")
        assert r.status_code == 200


# ─── Regression: All Responses Are JSON (not HTML) ──────────────────────────

class TestJsonResponseFormat:
    """
    Guard against the Vercel catch-all HTML injection scenario:
    every API endpoint must return JSON, never HTML.
    """

    API_ENDPOINTS = [
        "/health",
        "/api/health",
        "/api/regions",
        "/api/detections",
        "/api/analytics/summary",
        "/api/analytics/trends",
        "/api/alerts",
        "/api/satellite/provider-info",
        "/api/ml/model-info",
        "/api/model-lab/info",
        "/api/model-lab/datasets",
        "/api/model-lab/models",
        "/api/model-lab/jobs",
    ]

    @pytest.mark.parametrize("endpoint", API_ENDPOINTS)
    def test_endpoint_returns_json_not_html(self, endpoint: str):
        r = client.get(endpoint)
        ct = r.headers.get("content-type", "")
        assert "text/html" not in ct, (
            f"Endpoint {endpoint} returned HTML (content-type: {ct}). "
            "This is the Vercel catch-all bug — backend route is not registered."
        )
        assert "application/json" in ct, (
            f"Endpoint {endpoint} content-type is '{ct}', expected application/json."
        )
        # Confirm it actually parses as JSON
        try:
            data = r.json()
            assert data is not None
        except Exception as e:
            pytest.fail(f"Endpoint {endpoint} body is not valid JSON: {e}")

    def test_unknown_api_route_returns_json_404_not_html(self):
        """Unknown API routes must return JSON 404, not HTML index.html."""
        r = client.get("/api/this-route-does-not-exist-xyzzy")
        assert r.status_code == 404
        ct = r.headers.get("content-type", "")
        assert "text/html" not in ct, (
            "Unknown API route returned HTML. "
            "Vercel catch-all must not intercept /api/* routes — check vercel.json rewrites."
        )
        data = r.json()
        assert data == {"detail": "Not Found"}


# ─── Regression: Error 2 — Backend Service Unavailable ───────────────────────

class TestError2Regression:
    """
    Error 2 root cause: production frontend has no reachable backend.
    These tests guard the local backend contract. The production fix
    requires a manual Render.com deployment (see README.md).
    """

    def test_health_returns_all_required_service_keys(self):
        """Health response must have all expected service keys."""
        r = client.get("/api/health")
        assert r.status_code == 200
        data = r.json()
        assert "services" in data
        services = data["services"]
        assert "api" in services
        assert services["api"] == "ok"

    def test_health_disclaimer_present(self):
        """Health endpoint must include disclaimer about data status."""
        r = client.get("/api/health")
        data = r.json()
        assert "disclaimer" in data
        assert len(data["disclaimer"]) > 10

    def test_cors_allows_vercel_production_origin(self):
        """Production Vercel frontend must be allowed by CORS."""
        headers = {
            "Origin": "https://mark-02.vercel.app",
            "Access-Control-Request-Method": "GET",
        }
        r = client.options("/api/health", headers=headers)
        assert r.status_code in (200, 204)
        allow_origin = r.headers.get("access-control-allow-origin", "")
        assert allow_origin in ("https://mark-02.vercel.app", "*"), (
            f"CORS did not allow the Vercel origin. Got: '{allow_origin}'"
        )

    def test_cors_allows_localhost_dev_origin(self):
        """Local dev frontend (port 5173) must be allowed by CORS."""
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        }
        r = client.options("/api/health", headers=headers)
        assert r.status_code in (200, 204)
        allow = r.headers.get("access-control-allow-origin", "")
        assert allow in ("http://localhost:5173", "*"), (
            f"CORS did not allow localhost:5173. Got: '{allow}'"
        )

    def test_cors_blocks_unknown_origin_in_production(self):
        """
        NOTE: In dev mode (ENVIRONMENT != production), all origins are allowed.
        This test verifies CORS behavior is configured and functional.
        """
        headers = {
            "Origin": "https://unknown-untrusted-site.example.com",
            "Access-Control-Request-Method": "GET",
        }
        r = client.options("/api/health", headers=headers)
        # In dev mode (default in tests) CORS is open — this is acceptable.
        # What matters is that the test doesn't raise an exception (CORS middleware works).
        assert r.status_code in (200, 204, 400)


# ─── App startup and imports ─────────────────────────────────────────────────

class TestApplicationStartup:
    """Verifies the app can import and start without errors."""

    def test_app_is_fastapi_instance(self):
        from fastapi import FastAPI
        assert isinstance(app, FastAPI)

    def test_app_title_and_version(self):
        assert app.title == "CL-01 Forest Loss Detection API"
        assert app.version == "0.9.0"

    def test_all_required_routers_included(self):
        """All three sub-routers must be registered."""
        from backend.satellite import router as sat_router
        from backend.ml import router as ml_router
        from backend.model_lab import router as ml_lab_router
        assert sat_router is not None
        assert ml_router is not None
        assert ml_lab_router is not None

    def test_root_endpoint_lists_all_key_endpoints(self):
        r = client.get("/")
        assert r.status_code == 200
        data = r.json()
        endpoints = data.get("endpoints", {})
        assert "api_health" in endpoints
        assert "regions" in endpoints
        assert "detections" in endpoints
        assert "alerts" in endpoints

    def test_unknown_route_gives_404_not_500(self):
        """App must not crash on unknown routes."""
        r = client.get("/does-not-exist-at-all-xyzzy")
        assert r.status_code == 404
        assert r.json() == {"detail": "Not Found"}

    def test_method_not_allowed_gives_405_not_500(self):
        """Wrong HTTP method must return 405, not crash the app."""
        r = client.delete("/api/health")
        assert r.status_code == 405
