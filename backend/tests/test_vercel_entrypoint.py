"""
CL-01 — Vercel Serverless Function Regression Test Suite
========================================================
Validates that api/index.py properly wraps the FastAPI application
and responds correctly to both direct (/api/*) and stripped (/*) routes,
ensuring zero 404 errors regardless of Vercel proxy rewrite variations.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.index import app as vercel_app

client = TestClient(vercel_app, raise_server_exceptions=True)


class TestVercelEntrypointHealth:
    def test_health_with_api_prefix(self):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/json")
        data = r.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "services" in data

    def test_health_without_api_prefix(self):
        r = client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"


class TestVercelEntrypointCoreRoutes:
    """Verifies that all core platform endpoints work with and without /api prefix."""

    @pytest.mark.parametrize("prefix", ["/api", ""])
    def test_regions_endpoint(self, prefix):
        r = client.get(f"{prefix}/regions")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert len(data["data"]) > 0

    @pytest.mark.parametrize("prefix", ["/api", ""])
    def test_detections_endpoint(self, prefix):
        r = client.get(f"{prefix}/detections")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "pagination" in data

    @pytest.mark.parametrize("prefix", ["/api", ""])
    def test_analytics_summary_endpoint(self, prefix):
        r = client.get(f"{prefix}/analytics/summary")
        assert r.status_code == 200
        data = r.json()
        assert "totalDetections" in data

    @pytest.mark.parametrize("prefix", ["/api", ""])
    def test_analytics_trends_endpoint(self, prefix):
        r = client.get(f"{prefix}/analytics/trends")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data

    @pytest.mark.parametrize("prefix", ["/api", ""])
    def test_alerts_endpoint(self, prefix):
        r = client.get(f"{prefix}/alerts")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "summary" in data

    @pytest.mark.parametrize("prefix", ["/api", ""])
    def test_reports_export_endpoint(self, prefix):
        r = client.get(f"{prefix}/reports/export?format=json")
        assert r.status_code == 200
        data = r.json()
        assert "records" in data


class TestVercelEntrypointSubsystems:
    """Verifies satellite, ml, and model-lab subsystems through the Vercel entrypoint."""

    @pytest.mark.parametrize("prefix", ["/api", ""])
    def test_satellite_provider_info(self, prefix):
        r = client.get(f"{prefix}/satellite/provider-info")
        assert r.status_code == 200
        data = r.json()
        assert "documentation" in data

    @pytest.mark.parametrize("prefix", ["/api", ""])
    def test_ml_model_info(self, prefix):
        r = client.get(f"{prefix}/ml/model-info")
        assert r.status_code == 200
        data = r.json()
        assert "model_architecture" in data

    @pytest.mark.parametrize("prefix", ["/api", ""])
    def test_model_lab_info(self, prefix):
        r = client.get(f"{prefix}/model-lab/info")
        assert r.status_code == 200
        data = r.json()
        assert "available_architectures" in data

    @pytest.mark.parametrize("prefix", ["/api", ""])
    def test_model_lab_datasets(self, prefix):
        r = client.get(f"{prefix}/model-lab/datasets")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    @pytest.mark.parametrize("prefix", ["/api", ""])
    def test_model_lab_models(self, prefix):
        r = client.get(f"{prefix}/model-lab/models")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)


class TestVercelEntrypointUnknownRoutes:
    """Unknown routes must return genuine 404 Not Found, not masked or faked."""

    def test_unknown_api_route_returns_404(self):
        r = client.get("/api/nonexistent-endpoint-xyz-987")
        assert r.status_code == 404
        assert r.headers["content-type"].startswith("application/json")
        data = r.json()
        assert "detail" in data

    def test_unknown_direct_route_returns_404(self):
        r = client.get("/nonexistent-endpoint-xyz-987")
        assert r.status_code == 404
        assert r.headers["content-type"].startswith("application/json")
