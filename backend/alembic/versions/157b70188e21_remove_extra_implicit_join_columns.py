"""Remove extra implicit join columns

Revision ID: 157b70188e21
Revises: 9cd74691080a
Create Date: 2026-02-25 12:55:06.043095

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '157b70188e21'
down_revision: Union[str, Sequence[str], None] = '9cd74691080a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('ALTER TABLE users DROP COLUMN IF EXISTS id_landlord_requests_user_id')
    op.execute('ALTER TABLE users DROP COLUMN IF EXISTS id_landlord_requests_admin_id')

    # LandlordRequest table
    op.execute('ALTER TABLE landlord_requests DROP COLUMN IF EXISTS user_id_user_id')
    op.execute('ALTER TABLE landlord_requests DROP COLUMN IF EXISTS admin_id_user_id')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('users', sa.Column('id_landlord_requests_user_id', sa.Integer))
    op.add_column('users', sa.Column('id_landlord_requests_admin_id', sa.Integer))
    op.add_column('landlord_requests', sa.Column('user_id_user_id', sa.Integer))
    op.add_column('landlord_requests', sa.Column('admin_id_user_id', sa.Integer))
