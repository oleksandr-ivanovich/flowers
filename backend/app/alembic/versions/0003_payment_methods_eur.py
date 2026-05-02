"""add new payment methods (PayPal, Bizum, Tarjeta, Efectivo, Stripe, Укр карта)

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-02

"""
from collections.abc import Sequence

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        INSERT INTO payment_methods (name, is_active, is_bonus, sort_order) VALUES
            ('PayPal',     true, false, 6),
            ('Bizum',      true, false, 7),
            ('Tarjeta',    true, false, 8),
            ('Efectivo',   true, false, 9),
            ('Stripe',     true, false, 10),
            ('Укр карта',  true, false, 11)
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM payment_methods
        WHERE name IN ('PayPal', 'Bizum', 'Tarjeta', 'Efectivo', 'Stripe', 'Укр карта')
        """
    )
