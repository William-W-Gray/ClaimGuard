"""Health endpoint tests."""
from __future__ import annotations

from httpx import AsyncClient


async def test_liveness(client: AsyncClient):
    resp = await client.get("/api/v1/health/liveness")
    assert resp.status_code == 200
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["status"] == "alive"


async def test_readiness_reports_database_up(client: AsyncClient):
    resp = await client.get("/api/v1/health/readiness")
    assert resp.status_code == 200
    assert resp.json()["data"]["database"] == "up"


async def test_root_redirect_info(client: AsyncClient):
    resp = await client.get("/")
    assert resp.status_code == 200
    assert resp.json()["service"]


async def test_request_id_header_present(client: AsyncClient):
    resp = await client.get("/api/v1/health/liveness")
    assert "x-request-id" in resp.headers
