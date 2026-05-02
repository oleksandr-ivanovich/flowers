"""remove old payment methods (Готівка, Картка, Переказ, Інше)

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
        DELETE FROM payment_methods
        WHERE name IN ('Готівка', 'Картка', 'Переказ', 'Інше')
        """
    )


def downgrade() -> None:
    op.execute(
        """
        INSERT INTO payment_methods (name, is_active, is_bonus, sort_order) VALUES
            ('Готівка', true, false, 1),
            ('Картка',  true, false, 2),
            ('Переказ', true, false, 3),
            ('Інше',    true, false, 4)
        """
    )
