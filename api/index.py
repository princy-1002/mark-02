"""
CL-01 Environmental Intelligence Platform — Vercel Serverless Function Entry Point
==================================================================================
Exposes the FastAPI application directly to Vercel's Python runtime.
Enables same-origin API serving (/api/*) alongside the React/Vite frontend
on the same Vercel deployment without requiring any external backend host.
"""

from __future__ import annotations

import sys
import traceback
from pathlib import Path

# Add project root to sys.path so backend modules are discovered
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

try:
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
        if not path.startswith("/api") and path not in {"/", "/health", "/docs", "/redoc", "/openapi.json"}:
            request.scope["path"] = f"/api{path}"
        return await call_next(request)

except Exception as exc:
    import json
    from fastapi import FastAPI, Response
    app = FastAPI(title="CL-01 Startup Diagnostics")
    tb = traceback.format_exc()
    print(f"CL-01 Vercel Startup Failure: {exc}\n{tb}", file=sys.stderr)

    @app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"])
    def vercel_startup_error(full_path: str):
        return Response(
            content=json.dumps({
                "status": "error",
                "message": "FastAPI backend failed to initialize on Vercel",
                "error": str(exc),
                "traceback": tb.splitlines(),
            }),
            status_code=500,
            media_type="application/json",
        )
