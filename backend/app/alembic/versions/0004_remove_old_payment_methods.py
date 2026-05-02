"""deactivate old payment methods (Готівка, Картка, Переказ, Інше)

Revision ID: 0004
Revises: 0003
Create Date: 2026-05-02

"""
from collections.abc import Sequence

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE payment_methods
        SET is_active = false
        WHERE name IN ('Готівка', 'Картка', 'Переказ', 'Інше')
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE payment_methods
        SET is_active = true
        WHERE name IN ('Готівка', 'Картка', 'Переказ', 'Інше')
        """
    )
