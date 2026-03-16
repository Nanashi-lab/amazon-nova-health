"""ChatSession and ChatMessage models -- stubs for Phase 4."""

from sqlalchemy import Column, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="New Chat")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    messages = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # user or assistant
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, server_default=func.now())
    attachments = Column(JSON, nullable=True)

    session = relationship("ChatSession", back_populates="messages")
