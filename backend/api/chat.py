"""Chat endpoint -- SSE streaming via Strands Agent + session management."""

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse

from backend.agents.nova_agent import create_agent
from backend.database import SessionLocal, get_db
from backend.models.chat import ChatMessage, ChatSession
from backend.models.user import User
from backend.services.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None


# ---------------------------------------------------------------------------
# SSE streaming chat endpoint
# ---------------------------------------------------------------------------


@router.post("/api/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a message to the NovaHealth AI agent and stream back SSE events.

    Event types:
      - token:       {"text": "chunk"}
      - tool_start:  {"toolUseId": "...", "name": "..."}
      - tool_result: {"toolUseId": "...", "content": "..."}
      - done:        {"text": "full response", "sessionId": "..."}
      - error:       {"error": "message"}
    """
    # Create a dedicated DB session for the generator (outlives the request scope)
    db = SessionLocal()
    try:
        # Resolve or create session
        session_id = request.session_id
        if session_id is None:
            session_id = str(uuid.uuid4())
            session = ChatSession(
                id=session_id,
                user_id=current_user.id,
                title="New Chat",
            )
            db.add(session)
            db.commit()
        else:
            # Verify session exists and belongs to user
            session = (
                db.query(ChatSession)
                .filter(
                    ChatSession.id == session_id,
                    ChatSession.user_id == current_user.id,
                )
                .first()
            )
            if session is None:
                db.close()
                return EventSourceResponse(
                    _error_generator("Session not found"),
                    media_type="text/event-stream",
                )
    except Exception:
        db.close()
        raise

    # Load conversation history for context (last 20 messages, excluding current)
    history_messages = _load_session_history(db, session_id, limit=20)

    # Create a fresh agent per request with conversation history
    agent_instance = create_agent(messages=history_messages or None)

    return EventSourceResponse(
        _generate_sse(agent_instance, request.message, session_id, db, current_user.id),
        media_type="text/event-stream",
    )


def _load_session_history(
    db: Session, session_id: str, limit: int = 20
) -> list[dict]:
    """Load the last *limit* messages for a session, formatted for Strands Agent.

    Returns a list of Message dicts:
        [{"role": "user"|"assistant", "content": [{"text": "..."}]}, ...]
    """
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.asc())
        .limit(limit)
        .all()
    )
    messages: list[dict] = []
    for row in rows:
        if row.role in ("user", "assistant") and row.content:
            messages.append(
                {"role": row.role, "content": [{"text": row.content}]}
            )
    return messages


async def _error_generator(message: str):
    """Yield a single error SSE event."""
    yield {"event": "error", "data": json.dumps({"error": message})}


async def _generate_sse(
    agent_instance,
    message: str,
    session_id: str,
    db: Session,
    user_id: str,
):
    """Async generator translating Strands stream events into SSE events."""
    try:
        # Save user message before streaming
        user_msg = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="user",
            content=message,
            timestamp=datetime.now(timezone.utc),
        )
        db.add(user_msg)
        db.commit()

        full_text = ""
        tool_calls: list[dict] = []

        async for event in agent_instance.stream_async(message):
            # --- Text token ---
            if "data" in event and event["data"]:
                text = event["data"]
                full_text += text
                yield {"event": "token", "data": json.dumps({"text": text})}

            # --- Tool call starting ---
            chunk_event = event.get("event", {})
            if isinstance(chunk_event, dict):
                tool_use = (
                    chunk_event
                    .get("contentBlockStart", {})
                    .get("start", {})
                    .get("toolUse")
                )
                if tool_use:
                    tool_calls.append(
                        {"name": tool_use["name"], "toolUseId": tool_use["toolUseId"]}
                    )
                    yield {
                        "event": "tool_start",
                        "data": json.dumps(
                            {
                                "toolUseId": tool_use["toolUseId"],
                                "name": tool_use["name"],
                            }
                        ),
                    }

            # --- Tool result ---
            if event.get("type") == "tool_result":
                tr = event["tool_result"]
                content = tr.get("content", [])
                text_content = ""
                if isinstance(content, list):
                    for block in content:
                        if isinstance(block, dict) and "text" in block:
                            text_content += block["text"]
                elif isinstance(content, str):
                    text_content = content

                yield {
                    "event": "tool_result",
                    "data": json.dumps(
                        {
                            "toolUseId": tr["toolUseId"],
                            "content": text_content[:500],
                        }
                    ),
                }

            # --- Agent complete ---
            if "result" in event:
                yield {
                    "event": "done",
                    "data": json.dumps(
                        {"text": full_text, "sessionId": session_id}
                    ),
                }

        # Persist assistant message
        assistant_msg = ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role="assistant",
            content=full_text,
            timestamp=datetime.now(timezone.utc),
            attachments=tool_calls if tool_calls else None,
        )
        db.add(assistant_msg)

        # Auto-update session title from first user message
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if session and session.title == "New Chat":
            session.title = message[:50]

        db.commit()

    except Exception as e:
        logger.exception("SSE streaming error")
        yield {"event": "error", "data": json.dumps({"error": str(e)})}
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Session management REST endpoints
# ---------------------------------------------------------------------------


@router.post("/api/chat/sessions")
async def create_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new chat session."""
    session = ChatSession(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        title="New Chat",
    )
    db.add(session)
    db.commit()
    return {"id": session.id, "title": session.title}


@router.get("/api/chat/sessions")
async def list_sessions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List chat sessions for the current user, most recent first."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return [
        {
            "id": s.id,
            "title": s.title,
            "updatedAt": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in sessions
    ]


@router.get("/api/chat/sessions/{session_id}/messages")
async def get_messages(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all messages for a chat session, ordered by timestamp."""
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.timestamp.asc())
        .all()
    )
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "timestamp": m.timestamp.isoformat() if m.timestamp else None,
            "attachments": m.attachments,
        }
        for m in messages
    ]


class SaveMessageRequest(BaseModel):
    role: str
    content: str


@router.post("/api/chat/sessions/{session_id}/messages")
async def save_message(
    session_id: str,
    body: SaveMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Persist a voice transcript message to an existing chat session."""
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    msg = ChatMessage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        role=body.role,
        content=body.content,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(msg)

    # Auto-update session title from first user message (same as text chat)
    if body.role == "user" and session.title == "New Chat":
        session.title = body.content[:50]

    db.commit()
    return {"id": msg.id, "role": msg.role, "content": msg.content}
