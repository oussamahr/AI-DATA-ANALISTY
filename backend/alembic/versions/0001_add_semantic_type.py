"""Add semantic type to data profiles."""
from alembic import op
import sqlalchemy as sa

revision = "0001_add_semantic_type"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("data_profiles", sa.Column("semantic_type", sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column("data_profiles", "semantic_type")
