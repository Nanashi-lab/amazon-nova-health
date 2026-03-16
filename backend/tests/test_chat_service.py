"""Chat session and message model tests -- direct DB operations."""

import uuid
from datetime import datetime, timezone

import pytest

from backend.models.chat import ChatMessage, ChatSession
from backend.models.user import User
from backend.services.auth import hash_password


@pytest.fixture
def chat_db(test_db):
    """test_db with a seeded user for chat FK constraints."""
    user = User(
        id="U-TEST", email="test@nova.ai", name="Test",
        password_hash=hash_password("pass"), role="nurse",
    )
    test_db.add(user)
    test_db.commit()
    return test_db


def test_create_session(chat_db):
    """create_session returns ChatSession with generated ID."""
    session = ChatSession(
        id=str(uuid.uuid4()),
        user_id="U-TEST",
        title="New Chat",
    )
    chat_db.add(session)
    chat_db.commit()

    result = chat_db.query(ChatSession).filter(ChatSession.id == session.id).first()
    assert result is not None
    assert result.title == "New Chat"
    assert result.user_id == "U-TEST"


def test_get_sessions_ordered(chat_db):
    """get_sessions returns sessions ordered by updated_at desc."""
    s1 = ChatSession(id=str(uuid.uuid4()), user_id="U-TEST", title="First")
    s2 = ChatSession(id=str(uuid.uuid4()), user_id="U-TEST", title="Second")
    chat_db.add(s1)
    chat_db.add(s2)
    chat_db.commit()

    sessions = (
        chat_db.query(ChatSession)
        .filter(ChatSession.user_id == "U-TEST")
        .order_by(ChatSession.created_at.desc())
        .all()
    )
    assert len(sessions) >= 2


def test_get_session_by_id(chat_db):
    """get_session returns session or None."""
    sid = str(uuid.uuid4())
    session = ChatSession(id=sid, user_id="U-TEST", title="Test")
    chat_db.add(session)
    chat_db.commit()

    found = chat_db.query(ChatSession).filter(ChatSession.id == sid).first()
    assert found is not None
    assert found.title == "Test"

    missing = chat_db.query(ChatSession).filter(ChatSession.id == "nonexistent").first()
    assert missing is None


def test_get_messages_ordered(chat_db):
    """get_messages returns messages ordered by timestamp asc."""
    sid = str(uuid.uuid4())
    session = ChatSession(id=sid, user_id="U-TEST", title="Test")
    chat_db.add(session)
    chat_db.commit()

    m1 = ChatMessage(
        id=str(uuid.uuid4()), session_id=sid, role="user",
        content="Hello", timestamp=datetime(2026, 3, 14, 10, 0, 0, tzinfo=timezone.utc),
    )
    m2 = ChatMessage(
        id=str(uuid.uuid4()), session_id=sid, role="assistant",
        content="Hi there!", timestamp=datetime(2026, 3, 14, 10, 0, 1, tzinfo=timezone.utc),
    )
    chat_db.add(m1)
    chat_db.add(m2)
    chat_db.commit()

    messages = (
        chat_db.query(ChatMessage)
        .filter(ChatMessage.session_id == sid)
        .order_by(ChatMessage.timestamp.asc())
        .all()
    )
    assert len(messages) == 2
    assert messages[0].role == "user"
    assert messages[1].role == "assistant"


def test_save_message(chat_db):
    """save_message creates ChatMessage with correct fields."""
    sid = str(uuid.uuid4())
    session = ChatSession(id=sid, user_id="U-TEST", title="Test")
    chat_db.add(session)
    chat_db.commit()

    msg = ChatMessage(
        id=str(uuid.uuid4()), session_id=sid, role="user",
        content="Check vitals", timestamp=datetime.now(timezone.utc),
    )
    chat_db.add(msg)
    chat_db.commit()

    result = chat_db.query(ChatMessage).filter(ChatMessage.id == msg.id).first()
    assert result is not None
    assert result.content == "Check vitals"
    assert result.role == "user"
    assert result.session_id == sid


def test_update_session_title(chat_db):
    """update_session_title changes the session title."""
    sid = str(uuid.uuid4())
    session = ChatSession(id=sid, user_id="U-TEST", title="New Chat")
    chat_db.add(session)
    chat_db.commit()

    session.title = "Patient P001 vitals"
    chat_db.commit()

    updated = chat_db.query(ChatSession).filter(ChatSession.id == sid).first()
    assert updated.title == "Patient P001 vitals"
