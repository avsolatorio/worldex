"""Cache dataset counts per osm tile

Revision ID: 7bf546720f4b
Revises: dfd7ba969b8b
Create Date: 2024-03-07 11:04:25.571596

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '7bf546720f4b'
down_revision: Union[str, None] = 'dfd7ba969b8b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('dataset_count_tiles',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('cached_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('z', sa.Integer(), nullable=False),
    sa.Column('x', sa.Integer(), nullable=False),
    sa.Column('y', sa.Integer(), nullable=False),
    sa.Column('dataset_counts', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('z', 'x', 'y')
    )
    op.create_index('ix_dataset_count_tiles_zxy', 'dataset_count_tiles', ['z', 'x', 'y'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index('ix_dataset_count_tiles_zxy', table_name='dataset_count_tiles')
    op.drop_table('dataset_count_tiles')
    # ### end Alembic commands ###
