"""Demo orchestration — drives realtime scenarios over the WebSocket gateway.

Mirrors the frontend's mock event emitter so investors can run scripted
fraud-detection storylines against the real backend.
"""
from __future__ import annotations

import asyncio

from fastapi import APIRouter

from app.core.responses import success
from app.core.websocket import WSEventType, manager
from app.services.notifications import record_event_notification

router = APIRouter(prefix="/demo", tags=["demo"])

SCENARIOS = {
    "ghost-prescription": {
        "name": "Ghost Prescription Syndicate",
        "description": "Prescription dated after service, no registered condition.",
        "color": "red",
    },
    "shortfall-inflation": {
        "name": "Shortfall Inflation",
        "description": "Member shortfall inflated above expected range.",
        "color": "amber",
    },
    "clean-claim": {
        "name": "Clean Claim",
        "description": "Legitimate claim — auto-approved instantly.",
        "color": "green",
    },
}


@router.get("/scenarios", summary="List available demo scenarios")
async def list_scenarios() -> dict:
    return success(
        [{"id": k, **v} for k, v in SCENARIOS.items()], "Scenarios"
    )


async def _run_ghost_prescription() -> None:
    payload = {
        "claimRef": "CG-00291",
        "member": "Tendai Moyo",
        "provider": "City Pharmacy Bulawayo",
        "amount": 88.00,
        "riskScore": 89,
        "decision": "PEND_INVESTIGATE",
        "latencyMs": 680,
    }
    await manager.broadcast(WSEventType.CLAIM_SCORED, payload)
    await record_event_notification("claim_scored", payload)
    await asyncio.sleep(1.4)
    await manager.broadcast(
        WSEventType.NH263_WEBHOOK,
        {"claimRef": "CG-00291", "status": "PEND_INVESTIGATE", "source": "NH263"},
    )
    await asyncio.sleep(1.4)
    await manager.broadcast(
        WSEventType.NOTIFICATION_SENT,
        {"member": "Tendai Moyo", "channel": "WHATSAPP", "claimRef": "CG-00291"},
    )
    await asyncio.sleep(2.0)
    await manager.broadcast(WSEventType.QUEUE_UPDATED, {"added": "CG-00291", "pending": 13})
    await asyncio.sleep(2.5)
    member_event = {"claimRef": "CG-00291", "member": "Tendai Moyo", "response": "DISPUTED"}
    await manager.broadcast(WSEventType.MEMBER_RESPONSE, member_event)
    await record_event_notification("member_response", member_event)
    await asyncio.sleep(0.5)
    trust_event = {
        "provider": "City Pharmacy Bulawayo",
        "code": "PROV-BYO-00441",
        "oldScore": 88,
        "newScore": 81,
    }
    await manager.broadcast(WSEventType.TRUSTSCORE_UPDATED, trust_event)
    await record_event_notification("trustscore_updated", trust_event)


async def _run_shortfall_inflation() -> None:
    scored = {
        "claimRef": "CG-00441",
        "member": "Joseph Chikwanda",
        "riskScore": 67,
        "decision": "PEND_VERIFY",
        "latencyMs": 420,
    }
    await manager.broadcast(WSEventType.CLAIM_SCORED, scored)
    await record_event_notification("claim_scored", scored)
    await asyncio.sleep(2.5)
    await manager.broadcast(
        WSEventType.NOTIFICATION_SENT,
        {"member": "Joseph Chikwanda", "channel": "WHATSAPP"},
    )


async def _run_clean_claim() -> None:
    scored = {
        "claimRef": "CG-00882",
        "member": "Mary Dzivaguru",
        "riskScore": 18,
        "decision": "APPROVE",
        "latencyMs": 310,
    }
    await manager.broadcast(WSEventType.CLAIM_SCORED, scored)
    await record_event_notification("claim_scored", scored)


_RUNNERS = {
    "ghost-prescription": _run_ghost_prescription,
    "shortfall-inflation": _run_shortfall_inflation,
    "clean-claim": _run_clean_claim,
}


@router.post("/scenarios/{scenario_id}/run", summary="Run a scenario (fire WS events)")
async def run_scenario(scenario_id: str) -> dict:
    runner = _RUNNERS.get(scenario_id)
    if not runner:
        return success(None, f"Unknown scenario: {scenario_id}")
    # Fire-and-forget so the HTTP call returns immediately.
    asyncio.create_task(runner())
    return success(
        {"scenario": scenario_id, "connections": manager.active_count},
        "Scenario started",
    )
