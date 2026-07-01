"""RBAC negative paths — non-admins are blocked from admin-only endpoints."""
from __future__ import annotations

from httpx import AsyncClient


async def test_agent_cannot_create_users(client: AsyncClient, agent_headers: dict):
    resp = await client.post(
        "/api/v1/auth/users",
        headers=agent_headers,
        json={
            "email": "intruder@claimguard.co.zw",
            "fullName": "Intruder",
            "password": "whatever-123",
            "roles": ["admin"],
        },
    )
    assert resp.status_code == 403


async def test_admin_can_create_users(client: AsyncClient, auth_headers: dict):
    resp = await client.post(
        "/api/v1/auth/users",
        headers=auth_headers,
        json={
            "email": "newanalyst@claimguard.co.zw",
            "fullName": "New Analyst",
            "password": "a-strong-password",
            "roles": ["analyst"],
        },
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["email"] == "newanalyst@claimguard.co.zw"


async def test_agent_still_reads_phi(client: AsyncClient, agent_headers: dict):
    # Authorization is role-scoped, not all-or-nothing: an agent can do their job.
    assert (await client.get("/api/v1/claims", headers=agent_headers)).status_code == 200
