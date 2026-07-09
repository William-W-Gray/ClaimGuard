"""Restore specific demo claims to their pristine seeded state.

Utility for undoing an ad-hoc rescore during testing: the seeder is create-only
(skips existing claims), so it can't reset a claim that was rescored. This resets
the scored fields, flags and SHAP contributions from the seed data and removes
any "FraudShield rescored" timeline events.

    python -m scripts.restore_demo_claims CG-00112 CG-00441 CG-00088
"""
from __future__ import annotations

import asyncio
import sys

from sqlalchemy import select

import scripts.seed_data as sd
from app.core.database import SessionFactory
from app.models.claim import Claim, ClaimFlag, ShapContribution


async def restore(refs: list[str]) -> None:
    by_ref = {c["claim_ref"]: c for c in sd.CLAIMS}
    async with SessionFactory() as session:
        for ref in refs:
            c = by_ref.get(ref)
            if c is None:
                print(f"[restore] {ref}: not in seed data — skipped")
                continue
            claim = (
                await session.execute(select(Claim).where(Claim.claim_ref == ref))
            ).scalar_one_or_none()
            if claim is None:
                print(f"[restore] {ref}: not found in DB — skipped")
                continue

            claim.risk_score = c["risk_score"]
            claim.risk_level = c["risk_level"]
            claim.decision = c["decision"]
            claim.priority = c["priority"]
            claim.ai_explanation = c["ai_explanation"]
            claim.latency_ms = c["latency_ms"]
            claim.flags = [ClaimFlag(code=code, severity=sev) for (code, sev) in c["flags"]]
            claim.shap_contributions = [
                ShapContribution(feature=f, contribution=val, direction=d)
                for (f, val, d) in c["shap"]
            ]
            claim.timeline = [
                t for t in claim.timeline if not t.event.startswith("FraudShield rescored")
            ]
            print(f"[restore] {ref}: reset to seeded risk={c['risk_score']} {c['risk_level']}")
        await session.commit()


if __name__ == "__main__":
    targets = sys.argv[1:] or ["CG-00112", "CG-00441", "CG-00088"]
    asyncio.run(restore(targets))
