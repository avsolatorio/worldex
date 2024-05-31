"""Indicate template datasets with has_derivatives

Revision ID: 6f7ffba53265
Revises: a815ae2a370e
Create Date: 2024-05-02 14:14:02.561054

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '6f7ffba53265'
down_revision: Union[str, None] = 'a815ae2a370e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('datasets', sa.Column('has_derivatives', sa.Boolean(), server_default=sa.text('false'), nullable=False))


def downgrade() -> None:
    op.drop_column('datasets', 'has_derivatives')
