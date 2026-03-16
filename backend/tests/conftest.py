"""Shared test fixtures for the NovaHealth backend tests."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.main import app


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_agent():
    """Mock the agent call in api.chat to avoid real AWS Bedrock calls.

    Returns a canned response instead of calling Nova 2 Lite.
    """
    mock_result = MagicMock()
    mock_result.__str__ = lambda self: "Patient P001 (Margaret Chen) is in critical condition in Room 101."

    with patch("backend.api.chat.agent", return_value=mock_result) as mock:
        yield mock


@pytest.fixture
def test_db():
    """In-memory SQLite database session for unit tests.

    Creates all tables (except 'embeddings' which requires pgvector)
    from the SQLAlchemy Base metadata, yields a session, and tears down.

    Available once backend.database is created (Plan 01).
    """
    try:
        from backend.database import Base
    except ImportError:
        pytest.skip("backend.database not yet created (Plan 01)")

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # SQLite doesn't support pgvector, so skip vector-related tables
    tables = [
        t for t in Base.metadata.sorted_tables if t.name != "embeddings"
    ]
    Base.metadata.create_all(bind=engine, tables=tables)

    TestingSessionLocal = sessionmaker(bind=engine)
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine, tables=tables)
        engine.dispose()


@pytest.fixture
def test_client_with_db(test_db):
    """FastAPI test client that uses the SQLite test database.

    Overrides the get_db dependency so all endpoints use the test session.
    """
    try:
        from backend.database import get_db
    except ImportError:
        pytest.skip("backend.database not yet created (Plan 01)")

    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()
