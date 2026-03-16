"""User model -- nurse authentication."""

from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="nurse")
    created_at = Column(DateTime, server_default=func.now())
