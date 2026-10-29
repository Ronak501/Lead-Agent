import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool, QueuePool
from .config import settings

logger = logging.getLogger("leadpilot.database")

raw_db_url = (settings.DATABASE_URL or "").strip()

# If empty or whitespace, fallback to SQLite safely
if not raw_db_url:
    logger.info("DATABASE_URL is empty, defaulting to SQLite local db.")
    raw_db_url = "sqlite:///./leadpilot.db"

# Normalize connection string for psycopg3 and Neon pooling
if raw_db_url.startswith("postgres://"):
    db_url = raw_db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+psycopg://"):
    db_url = raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    db_url = raw_db_url

# Neon best practice for serverless: strip channel_binding if present to avoid driver handshake mismatch
if "channel_binding=require" in db_url:
    db_url = db_url.replace("&channel_binding=require", "").replace("channel_binding=require&", "").replace("channel_binding=require", "")

# Handle sqlite vs postgres engine configuration
engine_kwargs = {}
if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    # Recommended Neon serverless pooling settings:
    # If connecting to Neon's PgBouncer pooler (-pooler in hostname), use NullPool.
    # PgBouncer handles the connection pool on Neon's edge, avoiding QueuePool limit errors.
    if "-pooler" in db_url:
        engine_kwargs["poolclass"] = NullPool
    else:
        # For direct connections, use a generous pool to handle concurrent dashboard requests
        engine_kwargs["poolclass"] = QueuePool
        engine_kwargs["pool_size"] = 25
        engine_kwargs["max_overflow"] = 50
        engine_kwargs["pool_timeout"] = 30

    engine_kwargs["pool_pre_ping"] = True  # Verifies connection liveness on checkout
    engine_kwargs["pool_recycle"] = 300    # Recycles idle connections every 5 mins

try:
    engine = create_engine(db_url, **engine_kwargs)
    # Test connection
    with engine.connect() as conn:
        pass
    logger.info("Successfully connected to Neon PostgreSQL database!")
except Exception as e:
    logger.warning(f"Could not connect to configured DATABASE_URL: {e}. Falling back to SQLite local db.")
    db_url = "sqlite:///./leadpilot.db"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
