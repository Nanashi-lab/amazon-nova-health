"""Tests for the SSE chat endpoint and session management (AGNT-04)."""

import json
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.database import get_db
from backend.main import app
from backend.models.chat import ChatMessage, ChatSession
from backend.models.user import User
from backend.services.auth import create_access_token, get_current_user, hash_password


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def test_user(test_db):
    """Create and return a test nurse user."""
    user = User(
        id="U-TEST",
        email="test@novahealth.ai",
        name="TestNurse",
        password_hash=hash_password("testpass"),
        role="nurse",
    )
    test_db.add(user)
    test_db.commit()
    return user


@pytest.fixture
def auth_token(test_user):
    """JWT token for the test user."""
    return create_access_token(test_user.id, test_user.email)


@pytest.fixture
def auth_header(auth_token):
    """Authorization header dict."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def authed_client(test_db, test_user):
    """FastAPI test client with DB and auth dependency overrides."""
    # Eagerly capture user attributes to avoid lazy-load issues across sessions
    user_id = test_user.id
    user_email = test_user.email
    user_name = test_user.name
    user_role = test_user.role

    class FakeUser:
        """Lightweight user stand-in that avoids SQLAlchemy lazy loading."""
        id = user_id
        email = user_email
        name = user_name
        role = user_role

    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    def override_get_current_user():
        return FakeUser()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Session management tests
# ---------------------------------------------------------------------------


def test_create_session(authed_client):
    """POST /api/chat/sessions creates a new session."""
    response = authed_client.post("/api/chat/sessions")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["title"] == "New Chat"


def test_list_sessions(authed_client):
    """GET /api/chat/sessions returns sessions ordered by most recent."""
    r1 = authed_client.post("/api/chat/sessions")
    r2 = authed_client.post("/api/chat/sessions")
    assert r1.status_code == 200
    assert r2.status_code == 200

    response = authed_client.get("/api/chat/sessions")
    assert response.status_code == 200
    sessions = response.json()
    assert len(sessions) >= 2
    for s in sessions:
        assert "id" in s
        assert "title" in s
        assert "updatedAt" in s


def test_get_session_messages(authed_client, test_db):
    """GET /api/chat/sessions/{id}/messages returns messages in order."""
    r = authed_client.post("/api/chat/sessions")
    session_id = r.json()["id"]

    msg1 = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="user",
        content="Hello agent",
        timestamp=datetime(2026, 3, 14, 10, 0, 0, tzinfo=timezone.utc),
    )
    msg2 = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role="assistant",
        content="Hello nurse!",
        timestamp=datetime(2026, 3, 14, 10, 0, 1, tzinfo=timezone.utc),
    )
    test_db.add(msg1)
    test_db.add(msg2)
    test_db.commit()

    response = authed_client.get(f"/api/chat/sessions/{session_id}/messages")
    assert response.status_code == 200
    messages = response.json()
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "Hello agent"
    assert messages[1]["role"] == "assistant"
    assert messages[1]["content"] == "Hello nurse!"


def test_chat_requires_auth():
    """POST /api/chat without auth returns 401."""
    app.dependency_overrides.clear()
    client = TestClient(app)
    response = client.post("/api/chat", json={"message": "hello"})
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# SSE streaming tests
# ---------------------------------------------------------------------------


def _parse_sse_events(raw_text: str) -> list[dict]:
    """Parse raw SSE text into a list of {event, data} dicts."""
    events = []
    current_event = None
    current_data = None

    for line in raw_text.split("\n"):
        line = line.strip()
        if line.startswith("event:"):
            current_event = line.split(":", 1)[1].strip()
        elif line.startswith("data:"):
            current_data = line.split(":", 1)[1].strip()
        elif line == "" and current_event is not None and current_data is not None:
            events.append({"event": current_event, "data": json.loads(current_data)})
            current_event = None
            current_data = None

    # Handle final event without trailing blank line
    if current_event is not None and current_data is not None:
        events.append({"event": current_event, "data": json.loads(current_data)})

    return events


def test_chat_sse_streaming(authed_client, test_db, test_user):
    """POST /api/chat streams SSE with token and done events."""
    r = authed_client.post("/api/chat/sessions")
    session_id = r.json()["id"]

    mock_agent_instance = MagicMock()

    async def mock_stream(msg):
        yield {"data": "Hello"}
        yield {"data": " world"}
        yield {"result": {"stopReason": "end_turn"}}

    mock_agent_instance.stream_async = mock_stream

    with patch("backend.api.chat.create_agent", return_value=mock_agent_instance), \
         patch("backend.api.chat.SessionLocal", return_value=test_db):

        response = authed_client.post(
            "/api/chat",
            json={"message": "Say hello", "session_id": session_id},
        )
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

        events = _parse_sse_events(response.text)
        event_types = [e["event"] for e in events]

        assert "token" in event_types
        assert "done" in event_types

        token_events = [e for e in events if e["event"] == "token"]
        assert token_events[0]["data"]["text"] == "Hello"
        assert token_events[1]["data"]["text"] == " world"

        done_event = [e for e in events if e["event"] == "done"][0]
        assert done_event["data"]["text"] == "Hello world"
        assert done_event["data"]["sessionId"] == session_id

        # Verify messages persisted
        messages = (
            test_db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.timestamp.asc())
            .all()
        )
        assert len(messages) == 2
        assert messages[0].role == "user"
        assert messages[0].content == "Say hello"
        assert messages[1].role == "assistant"
        assert messages[1].content == "Hello world"


def test_chat_creates_session_if_none(authed_client, test_db):
    """POST /api/chat without session_id creates a new session."""
    mock_agent_instance = MagicMock()

    async def mock_stream(msg):
        yield {"data": "Hi"}
        yield {"result": {"stopReason": "end_turn"}}

    mock_agent_instance.stream_async = mock_stream

    with patch("backend.api.chat.create_agent", return_value=mock_agent_instance), \
         patch("backend.api.chat.SessionLocal", return_value=test_db):

        response = authed_client.post(
            "/api/chat",
            json={"message": "Hello there"},
        )
        assert response.status_code == 200
        events = _parse_sse_events(response.text)

        done_events = [e for e in events if e["event"] == "done"]
        assert len(done_events) == 1
        new_session_id = done_events[0]["data"]["sessionId"]
        assert new_session_id is not None

        session = (
            test_db.query(ChatSession)
            .filter(ChatSession.id == new_session_id)
            .first()
        )
        assert session is not None
        assert session.user_id == "U-TEST"


def test_session_title_auto_update(authed_client, test_db, test_user):
    """First message updates session title from 'New Chat' to truncated message."""
    r = authed_client.post("/api/chat/sessions")
    session_id = r.json()["id"]

    mock_agent_instance = MagicMock()

    async def mock_stream(msg):
        yield {"data": "OK"}
        yield {"result": {"stopReason": "end_turn"}}

    mock_agent_instance.stream_async = mock_stream

    with patch("backend.api.chat.create_agent", return_value=mock_agent_instance), \
         patch("backend.api.chat.SessionLocal", return_value=test_db):

        authed_client.post(
            "/api/chat",
            json={
                "message": "Check vitals for patient P001",
                "session_id": session_id,
            },
        )

        session = (
            test_db.query(ChatSession)
            .filter(ChatSession.id == session_id)
            .first()
        )
        assert session.title == "Check vitals for patient P001"
        assert session.title != "New Chat"


def test_health_returns_ok():
    """GET /health returns 200 with status ok."""
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
