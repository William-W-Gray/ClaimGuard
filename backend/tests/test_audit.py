"""PHI-read auditing + audit-trail access control."""
from __future__ import annotations

from httpx import AsyncClient


async def test_viewing_a_claim_is_audited(client: AsyncClient, auth_headers: dict):
    await client.get("/api/v1/claims/CG-00291", headers=auth_headers)
    resp = await client.get("/api/v1/audit?limit=100", headers=auth_headers)
    entries = resp.json()["data"]
    views = [
        e for e in entries
        if e["action"] == "claim.view" and e["entityId"] == "CG-00291"
    ]
    assert views, "claim detail view should be recorded in the audit log"
    assert views[0]["actorId"]  # attributed to the viewer


async def test_viewing_a_member_is_audited(client: AsyncClient, auth_headers: dict):
    listed = await client.get("/api/v1/members?page=1&page_size=1", headers=auth_headers)
    member_id = listed.json()["data"][0]["id"]
    await client.get(f"/api/v1/members/{member_id}", headers=auth_headers)

    resp = await client.get("/api/v1/audit?limit=200", headers=auth_headers)
    entries = resp.json()["data"]
    assert any(
        e["action"] == "member.view" and e["entityId"] == member_id for e in entries
    )


async def test_audit_requires_auth(client: AsyncClient):
    assert (await client.get("/api/v1/audit")).status_code == 401


async def test_audit_is_admin_only(client: AsyncClient, agent_headers: dict):
    # A non-admin (agent) must not read the audit trail.
    assert (await client.get("/api/v1/audit", headers=agent_headers)).status_code == 403
