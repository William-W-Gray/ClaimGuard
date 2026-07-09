"""add FraudShield input signals to claims

Adds the four boolean risk-signal inputs the scorer consumes, so a rescore
reproduces the same inputs (they aren't derivable from the other columns).
Existing rows are backfilled from their persisted flags — the seed encoded these
signals as ClaimFlag rows, which are the source of truth for the backfill.

Revision ID: b2f4a7c9d1e3
Revises: 1c7d6269db30
Create Date: 2026-07-09 02:40:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = 'b2f4a7c9d1e3'
down_revision: str | None = '1c7d6269db30'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (column, python/server default, flag code that implies the non-default value)
_SIGNALS = [
    ("prescription_after_service", False, "PRESCRIPTION_DATE_AFTER_SERVICE", True),
    ("has_biometric", True, "HIGH_VALUE_NO_BIOMETRIC", False),
    ("chronic_drug_no_condition", False, "CHRONIC_DRUG_NO_CONDITION_REGISTERED", True),
    ("syndicate_signal", False, "POTENTIAL_FRAUD_SYNDICATE_DETECTED", True),
]


def upgrade() -> None:
    for col, default, flag_code, backfill_value in _SIGNALS:
        op.add_column(
            "claims",
            sa.Column(
                col,
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true" if default else "false"),
            ),
        )
        # Backfill existing rows from their flags (source of truth).
        op.execute(
            sa.text(
                f"UPDATE claims SET {col} = :val WHERE id IN "
                "(SELECT claim_id FROM claim_flags WHERE code = :code)"
            ).bindparams(val=backfill_value, code=flag_code)
        )
        # Drop the server default now that all rows have a value; the app sets it.
        op.alter_column("claims", col, server_default=None)


def downgrade() -> None:
    for col, *_ in _SIGNALS:
        op.drop_column("claims", col)
