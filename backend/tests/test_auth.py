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


# ─── User management (admin) ───────────────────────────────────────────────────
async def _make_user(client: AsyncClient, auth_headers: dict, email: str, role="agent"):
    resp = await client.post(
        "/api/v1/auth/users",
        headers=auth_headers,
        json={
            "email": email,
            "fullName": "Test Person",
            "password": "Passw0rd!123",
            "roles": [role],
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["id"]


async def test_update_user_name_and_role(client: AsyncClient, auth_headers: dict):
    uid = await _make_user(client, auth_headers, "edit.me@claimguard.co.zw")
    resp = await client.patch(
        f"/api/v1/auth/users/{uid}",
        headers=auth_headers,
        json={"fullName": "Renamed Person", "roles": ["analyst"]},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["fullName"] == "Renamed Person"
    assert data["roles"] == ["analyst"]
    assert data["isActive"] is True


async def test_deactivate_then_reactivate_user(client: AsyncClient, auth_headers: dict):
    uid = await _make_user(client, auth_headers, "toggle.me@claimguard.co.zw")

    off = await client.patch(
        f"/api/v1/auth/users/{uid}", headers=auth_headers, json={"isActive": False}
    )
    assert off.status_code == 200
    assert off.json()["data"]["isActive"] is False

    # Hidden from the default (active-only) directory, visible with includeInactive.
    active = await client.get("/api/v1/users", headers=auth_headers)
    assert uid not in [u["id"] for u in active.json()["data"]]
    allu = await client.get(
        "/api/v1/users", headers=auth_headers, params={"include_inactive": True}
    )
    assert uid in [u["id"] for u in allu.json()["data"]]

    on = await client.patch(
        f"/api/v1/auth/users/{uid}", headers=auth_headers, json={"isActive": True}
    )
    assert on.json()["data"]["isActive"] is True


async def test_deactivated_user_cannot_login(client: AsyncClient, auth_headers: dict):
    email = "locked.out@claimguard.co.zw"
    uid = await _make_user(client, auth_headers, email)
    await client.patch(
        f"/api/v1/auth/users/{uid}", headers=auth_headers, json={"isActive": False}
    )
    client.cookies.clear()
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "Passw0rd!123"}
    )
    assert resp.status_code == 401


async def test_delete_user(client: AsyncClient, auth_headers: dict):
    uid = await _make_user(client, auth_headers, "delete.me@claimguard.co.zw")
    resp = await client.request(
        "DELETE", f"/api/v1/auth/users/{uid}", headers=auth_headers
    )
    assert resp.status_code == 200, resp.text
    gone = await client.get(
        "/api/v1/users", headers=auth_headers, params={"include_inactive": True}
    )
    assert uid not in [u["id"] for u in gone.json()["data"]]


async def test_admin_cannot_deactivate_self(client: AsyncClient, auth_headers: dict):
    me = await client.get("/api/v1/auth/me", headers=auth_headers)
    my_id = me.json()["data"]["id"]
    resp = await client.patch(
        f"/api/v1/auth/users/{my_id}", headers=auth_headers, json={"isActive": False}
    )
    assert resp.status_code == 422
    assert resp.json()["success"] is False


async def test_admin_cannot_delete_self(client: AsyncClient, auth_headers: dict):
    me = await client.get("/api/v1/auth/me", headers=auth_headers)
    my_id = me.json()["data"]["id"]
    resp = await client.request(
        "DELETE", f"/api/v1/auth/users/{my_id}", headers=auth_headers
    )
    assert resp.status_code == 422


async def test_update_user_requires_admin(
    client: AsyncClient, auth_headers: dict, agent_headers: dict
):
    uid = await _make_user(client, auth_headers, "guarded@claimguard.co.zw")
    resp = await client.patch(
        f"/api/v1/auth/users/{uid}", headers=agent_headers, json={"fullName": "Nope"}
    )
    assert resp.status_code == 403
    delete = await client.request(
        "DELETE", f"/api/v1/auth/users/{uid}", headers=agent_headers
    )
    assert delete.status_code == 403


async def test_update_missing_user_404(client: AsyncClient, auth_headers: dict):
    resp = await client.patch(
        "/api/v1/auth/users/00000000-0000-0000-0000-000000000000",
        headers=auth_headers,
        json={"fullName": "Ghost"},
    )
    assert resp.status_code == 404


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
