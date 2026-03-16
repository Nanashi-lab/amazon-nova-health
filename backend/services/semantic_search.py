"""Semantic search service -- embed query, cosine similarity against pgvector."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models.document import Document, Embedding
from backend.models.patient import Patient
from backend.services.document_service import get_embedding


def _run_vector_query(db: Session, query_vector: list[float], limit: int = 10) -> list[dict]:
    """Execute pgvector cosine distance query and return formatted results.

    Separated from semantic_search() to allow mocking in tests
    (SQLite cannot run cosine_distance).
    """
    stmt = (
        select(
            Embedding,
            Embedding.vector.cosine_distance(query_vector).label("distance"),
        )
        .where(Embedding.vector.cosine_distance(query_vector) < 0.95)  # permissive threshold; ranking handles relevance
        .order_by("distance")
        .limit(limit)
    )
    rows = db.execute(stmt).all()

    # Batch-fetch documents and patients (avoids N+1)
    doc_ids = {emb.document_id for emb, _ in rows}
    patient_ids = {emb.patient_id for emb, _ in rows}

    docs = db.query(Document).filter(Document.id.in_(doc_ids)).all() if doc_ids else []
    patients = db.query(Patient).filter(Patient.id.in_(patient_ids)).all() if patient_ids else []

    doc_map = {d.id: d for d in docs}
    patient_map = {p.id: p for p in patients}

    results = []
    for emb, distance in rows:
        doc = doc_map.get(emb.document_id)
        patient = patient_map.get(emb.patient_id)

        results.append({
            "id": str(emb.id),
            "type": "document",
            "title": doc.filename if doc else "Unknown",
            "snippet": emb.content_text or "",
            "relevanceScore": round(1.0 - distance, 3),
            "patientName": patient.name if patient else None,
            "date": doc.uploaded_at.isoformat() if doc and doc.uploaded_at else "",
        })

    return results


def semantic_search(db: Session, query: str, limit: int = 10) -> list[dict]:
    """Embed query with GENERIC_RETRIEVAL purpose, search pgvector by cosine similarity.

    Returns ranked results matching the SearchResponse shape:
    id, type, title, snippet, relevanceScore, patientName, date.
    """
    query_vector = get_embedding(query, purpose="GENERIC_RETRIEVAL")
    return _run_vector_query(db, query_vector, limit)
