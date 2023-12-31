"""unique

Revision ID: b66eab762188
Revises: 7edb34e8429f
Create Date: 2020-04-30 18:58:18.386373

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b66eab762188"
down_revision = "7edb34e8429f"
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index("password", table_name="user")
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_index("password", "user", ["password"], unique=True)
    # ### end Alembic commands ###
