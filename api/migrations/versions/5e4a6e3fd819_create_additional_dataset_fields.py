"""Create additional dataset fields

Revision ID: 5e4a6e3fd819
Revises: d93f2a583709
Create Date: 2023-09-19 15:46:08.001571

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from app.models import Box2D

# revision identifiers, used by Alembic.
revision: str = "5e4a6e3fd819"
down_revision: Union[str, None] = "d93f2a583709"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column("datasets", sa.Column("source_org", sa.String(), nullable=True))
    op.add_column(
        "datasets",
        sa.Column(
            "last_fetched",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.add_column("datasets", sa.Column("description", sa.String(), nullable=True))
    op.add_column("datasets", sa.Column("data_format", sa.String(), nullable=True))
    op.add_column("datasets", sa.Column("projection", sa.String(), nullable=True))
    op.add_column(
        "datasets",
        sa.Column("properties", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column("datasets", sa.Column("bbox", Box2D(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("datasets", "bbox")
    op.drop_column("datasets", "properties")
    op.drop_column("datasets", "projection")
    op.drop_column("datasets", "data_format")
    op.drop_column("datasets", "description")
    op.drop_column("datasets", "last_fetched")
    op.drop_column("datasets", "source_org")
    # ### end Alembic commands ###
