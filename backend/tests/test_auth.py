"""Authentication & RBAC tests."""
from __future__ import annotations

from httpx import AsyncClient


async def test_login_success(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@claimguard.co.zw", "password": "ChangeMe!2026"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["accessToken"]
    assert data["refreshToken"]


async def test_login_invalid_credentials(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@claimguard.co.zw", "password": "wrong"},
    )
    assert resp.status_code == 401
    assert resp.json()["success"] is False


async def test_me_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_me_returns_profile(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["email"] == "admin@claimguard.co.zw"
    assert data["isSuperuser"] is True


async def test_refresh_rotates_token(client: AsyncClient):
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@claimguard.co.zw", "password": "ChangeMe!2026"},
    )
    refresh_token = login.json()["data"]["refreshToken"]
    # The refresh cookie normally takes precedence; clear the jar so we exercise
    # the explicit body token (and can reuse the *old* one below).
    client.cookies.clear()
    resp = await client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token})
    assert resp.status_code == 200
    assert resp.json()["data"]["accessToken"]
    # Old token is now revoked (single-use rotation).
    client.cookies.clear()
    reuse = await client.post("/api/v1/auth/refresh", json={"refreshToken": refresh_token})
    assert reuse.status_code == 401


# ─── Notifications (persisted) ─────────────────────────────────────────────────
async def test_notifications_require_auth(client: AsyncClient):
    resp = await client.get("/api/v1/notifications")
    assert resp.status_code == 401


async def test_notifications_list_seeded(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/notifications", headers=auth_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["data"]) >= 3  # broadcast seeds
    assert body["metadata"]["unread"] >= 2


async def test_notifications_mark_all_read(client: AsyncClient, auth_headers: dict):
    await client.post("/api/v1/notifications/read-all", headers=auth_headers)
    resp = await client.get("/api/v1/notifications", headers=auth_headers)
    assert resp.json()["metadata"]["unread"] == 0


async def test_notifications_clear(client: AsyncClient, auth_headers: dict):
    await client.request("DELETE", "/api/v1/notifications", headers=auth_headers)
    resp = await client.get("/api/v1/notifications", headers=auth_headers)
    assert resp.json()["data"] == []
