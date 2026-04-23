"""landlord_request_three_docs

Revision ID: 0846e7ce04e6
Revises: a7835a810899
Create Date: 2026-04-23

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '0846e7ce04e6'
down_revision: Union[str, None] = 'a7835a810899'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: delete all existing landlord requests (they used the old schema)
    op.execute("DELETE FROM landlord_requests")

    # Step 2: drop old columns
    op.drop_column('landlord_requests', 'document_type')
    op.drop_column('landlord_requests', 'document_url')
    op.drop_column('landlord_requests', 'document_public_id')

    # Step 3: add new columns (safe now since table is empty)
    op.add_column('landlord_requests', sa.Column('title_deed_url', sa.String(), nullable=False))
    op.add_column('landlord_requests', sa.Column('title_deed_public_id', sa.String(), nullable=False))
    op.add_column('landlord_requests', sa.Column('lease_agreement_url', sa.String(), nullable=False))
    op.add_column('landlord_requests', sa.Column('lease_agreement_public_id', sa.String(), nullable=False))
    op.add_column('landlord_requests', sa.Column('authorization_letter_url', sa.String(), nullable=False))
    op.add_column('landlord_requests', sa.Column('authorization_letter_public_id', sa.String(), nullable=False))

    # Step 4: drop the documenttype enum
    op.execute("DROP TYPE IF EXISTS documenttype")


def downgrade() -> None:
    op.drop_column('landlord_requests', 'authorization_letter_public_id')
    op.drop_column('landlord_requests', 'authorization_letter_url')
    op.drop_column('landlord_requests', 'lease_agreement_public_id')
    op.drop_column('landlord_requests', 'lease_agreement_url')
    op.drop_column('landlord_requests', 'title_deed_public_id')
    op.drop_column('landlord_requests', 'title_deed_url')