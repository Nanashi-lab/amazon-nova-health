"""Document and Embedding models -- stubs for Phase 5."""

from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

from backend.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # pdf, image, text
    file_path = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now())


class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=True)
    content_type = Column(String, nullable=False)  # document, patient_record
    content_text = Column(Text, nullable=True)
    vector = Column(Vector(1024), nullable=True)  # Nova Embeddings 1024 dims
    created_at = Column(DateTime, server_default=func.now())
