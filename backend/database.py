"""Database connection, session factory, and initialization."""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

from backend.config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create pgvector extension and all tables."""
    import backend.models  # noqa: F401 -- ensure all models are registered

    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()

    Base.metadata.create_all(bind=engine)
