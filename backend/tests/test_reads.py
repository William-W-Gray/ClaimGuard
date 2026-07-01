"""Read-endpoint coverage: provider / trustscore / member detail (+ auth gates)."""
from __future__ import annotations

from httpx import AsyncClient


async def test_provider_detail_and_claims(client: AsyncClient, auth_headers: dict):
    listed = await client.get("/api/v1/providers?page=1&page_size=1", headers=auth_headers)
    code = listed.json()["data"][0]["code"]

    detail = await client.get(f"/api/v1/providers/{code}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["data"]["code"] == code

    claims = await client.get(f"/api/v1/providers/{code}/claims", headers=auth_headers)
    assert claims.status_code == 200
    assert isinstance(claims.json()["data"], list)


async def test_trustscore_ranked_list(client: AsyncClient, auth_headers: dict):
    resp = await client.get("/api/v1/trustscore", headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 1


async def test_member_detail_and_history(client: AsyncClient, auth_headers: dict):
    listed = await client.get("/api/v1/members?page=1&page_size=1", headers=auth_headers)
    member_id = listed.json()["data"][0]["id"]

    detail = await client.get(f"/api/v1/members/{member_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["data"]["id"] == member_id

    history = await client.get(f"/api/v1/members/{member_id}/claims", headers=auth_headers)
    assert history.status_code == 200
    assert isinstance(history.json()["data"], list)


async def test_reads_require_auth(client: AsyncClient):
    assert (await client.get("/api/v1/providers/ANY")).status_code == 401
    assert (await client.get("/api/v1/trustscore")).status_code == 401
    assert (await client.get("/api/v1/members/ANY")).status_code == 401
