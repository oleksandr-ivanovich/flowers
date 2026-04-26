"""customers and bonus payment method

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-26

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("phone", sa.String(30), nullable=False, unique=True),
        sa.Column(
            "bonus_balance", sa.Numeric(12, 2), nullable=False, server_default="0"
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )

    op.add_column(
        "payment_methods",
        sa.Column(
            "is_bonus",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.add_column(
        "transactions",
        sa.Column("customer_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_transactions_customer_id",
        "transactions",
        "customers",
        ["customer_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_transactions_customer_id", "transactions", ["customer_id"])

    op.execute(
        """
        INSERT INTO payment_methods (name, is_active, is_bonus, sort_order) VALUES
            ('Бонуси', true, true, 5)
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM payment_methods WHERE name = 'Бонуси'")
    op.drop_index("ix_transactions_customer_id", table_name="transactions")
    op.drop_constraint("fk_transactions_customer_id", "transactions", type_="foreignkey")
    op.drop_column("transactions", "customer_id")
    op.drop_column("payment_methods", "is_bonus")
    op.drop_table("customers")
