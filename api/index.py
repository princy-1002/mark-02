"""
CL-01 Environmental Intelligence Platform — Vercel Serverless Function Entry Point
==================================================================================
Exposes the FastAPI application directly to Vercel's Python runtime.
Enables same-origin API serving (/api/*) alongside the React/Vite frontend
on the same Vercel deployment without requiring any external backend host.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add project root to sys.path so backend modules are discovered
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from backend.main import app

# Normalization middleware: handles path variations between Vercel ASGI proxies
@app.middleware("http")
async def normalize_vercel_api_paths(request, call_next):
    """
    Ensures seamless routing whether Vercel preserves the /api prefix or strips it.
    If a request arrives without /api (e.g. /regions, /detections), prepend /api
    so all registered routes match without duplicate definitions.
    """
    path = request.scope.get("path", "")
    orig = request.headers.get("x-matched-path") or request.headers.get("x-vercel-matched-path")
    if orig and orig.startswith("/api/") and orig != "/api/index":
        request.scope["path"] = orig
    elif not path.startswith("/api") and path not in {"/", "/health", "/docs", "/redoc", "/openapi.json"}:
        request.scope["path"] = f"/api{path}"
    return await call_next(request)
