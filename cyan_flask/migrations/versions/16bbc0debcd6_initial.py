"""initial

Revision ID: 16bbc0debcd6
Revises: 
Create Date: 2020-04-29 09:51:21.819025

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '16bbc0debcd6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('location',
    sa.Column('owner', sa.String(length=35), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('type', sa.SmallInteger(), nullable=False),
    sa.Column('name', sa.String(length=256), nullable=False),
    sa.Column('latitude', sa.Numeric(precision=12, scale=10), nullable=False),
    sa.Column('longitude', sa.Numeric(precision=13, scale=10), nullable=False),
    sa.Column('marked', sa.Boolean(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=False),
    sa.Column('compare', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('owner', 'id', 'type')
    )
    op.create_table('notifications',
    sa.Column('owner', sa.String(length=35), nullable=False),
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('date', sa.DateTime(), nullable=False),
    sa.Column('subject', sa.String(length=256), nullable=False),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('is_new', sa.Boolean(), nullable=False),
    sa.PrimaryKeyConstraint('owner', 'id')
    )
    op.create_table('user',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(length=35), nullable=False),
    sa.Column('email', sa.String(length=50), nullable=False),
    sa.Column('password', sa.String(length=256), nullable=False),
    sa.Column('created', sa.Date(), nullable=False),
    sa.Column('last_visit', sa.Date(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email'),
    sa.UniqueConstraint('password'),
    sa.UniqueConstraint('username')
    )
    op.create_table('settings',
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('level_low', sa.Integer(), nullable=False),
    sa.Column('level_medium', sa.Integer(), nullable=False),
    sa.Column('level_high', sa.Integer(), nullable=False),
    sa.Column('enable_alert', sa.Boolean(), nullable=False),
    sa.Column('alert_value', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], ),
    sa.PrimaryKeyConstraint('user_id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('settings')
    op.drop_table('user')
    op.drop_table('notifications')
    op.drop_table('location')
    # ### end Alembic commands ###
