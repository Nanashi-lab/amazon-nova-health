"""Search service -- simple ILIKE search across patient, medication, and document fields."""

from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.models.document import Document
from backend.models.medication import Medication
from backend.models.patient import Patient


def simple_search(db: Session, query: str) -> list[dict]:
    """ILIKE search across patient name, room, condition, physician, medication names, and documents.

    Returns list of dicts matching frontend SearchResult shape.
    """
    like_pattern = f"%{query}%"

    # Search patient fields directly
    patient_matches = (
        db.query(Patient)
        .filter(
            or_(
                Patient.name.ilike(like_pattern),
                Patient.room.ilike(like_pattern),
                Patient.condition.ilike(like_pattern),
                Patient.attending_physician.ilike(like_pattern),
            )
        )
        .all()
    )

    # Search via medication name join
    med_patient_ids = (
        db.query(Medication.patient_id)
        .filter(Medication.name.ilike(like_pattern), Medication.active.is_(True))
        .distinct()
        .all()
    )
    med_patient_ids = {row[0] for row in med_patient_ids}

    # Fetch patients matched via medications (exclude already found)
    existing_ids = {p.id for p in patient_matches}
    if med_patient_ids - existing_ids:
        med_patients = (
            db.query(Patient)
            .filter(Patient.id.in_(med_patient_ids - existing_ids))
            .all()
        )
        patient_matches.extend(med_patients)

    # Convert to frontend SearchResult shape
    results = []
    for p in patient_matches:
        results.append(
            {
                "id": p.id,
                "type": "patient",
                "title": p.name,
                "snippet": f"{p.condition} - Room {p.room} - {p.status}",
                "relevanceScore": 1.0,
                "patientName": p.name,
                "date": p.admitted_date,
            }
        )

    # Search documents (filename and extracted text)
    doc_matches = (
        db.query(Document)
        .filter(
            or_(
                Document.filename.ilike(like_pattern),
                Document.extracted_text.ilike(like_pattern),
            )
        )
        .limit(20)
        .all()
    )
    # Batch-fetch patients for all matched docs (avoids N+1)
    doc_patient_ids = {doc.patient_id for doc in doc_matches}
    if doc_patient_ids:
        doc_patients = db.query(Patient).filter(Patient.id.in_(doc_patient_ids)).all()
        patient_map = {p.id: p for p in doc_patients}
    else:
        patient_map = {}

    for doc in doc_matches:
        patient = patient_map.get(doc.patient_id)
        results.append(
            {
                "id": str(doc.id),
                "type": "document",
                "title": doc.filename,
                "snippet": (doc.extracted_text or "")[:150],
                "relevanceScore": 1.0,
                "patientName": patient.name if patient else None,
                "date": doc.uploaded_at.isoformat() if doc.uploaded_at else "",
            }
        )

    return results
