"""add updated_at trigger for users table

Revision ID: bcf2b5eee42a
Revises: e0f734f7a2d4
Create Date: 2026-02-28 10:51:15.829214

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bcf2b5eee42a'
down_revision: Union[str, Sequence[str], None] = 'e0f734f7a2d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
