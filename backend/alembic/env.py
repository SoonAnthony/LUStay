from alembic.autogenerate import renderers
import sqlmodel

@renderers.dispatch_for(sqlmodel.sql.sqltypes.AutoString)
def render_autostring(autostring, autogen_context):
    return f"sa.String({autostring.length})"

import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import create_engine, pool
from sqlmodel import SQLModel
from alembic import context
from dotenv import load_dotenv

load_dotenv()

# Add app folder to sys.path
sys.path.append(str(Path(__file__).parent.parent / "app"))

from app.core.config import settings
from app.user.models import User, LandlordRequest, UserRole, RequestStatus
from app.hostels.models import Hostel, HostelImage, HostelBlock, Amenity, HostelAmenity, HostelStatus
from app.rooms.models import Room, RoomType, RoomTypeImage, RoomStatus
from app.bookings.models import Booking, BookingStatus
from app.payments.models import Payment, PaymentStatus
# Alembic config
config = context.config

DATABASE_URL = settings.DATABASE_URL.replace("+asyncpg", "")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")

config.set_main_option("sqlalchemy.url", DATABASE_URL)
# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = SQLModel.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.DATABASE_URL.replace("+asyncpg", "")  # make sure it’s sync
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True  # detect enum changes
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    # Use synchronous engine for Alembic
    sync_url = settings.DATABASE_URL.replace("+asyncpg", "")
    connectable = create_engine(sync_url, poolclass=pool.NullPool, future=True)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True  # important for enums
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()