"""Document upload and retrieval REST endpoints."""

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.document import Document
from backend.services.auth import get_current_user
from backend.services.document_service import UPLOAD_DIR, ingest_document

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload")
def upload_document(
    file: UploadFile = File(...),
    patient_id: str = Form(...),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Upload a document for a patient, triggering the ingest pipeline.

    Accepts multipart/form-data with a file and patient_id.
    Stores the file on disk, reads text content, generates an embedding
    via Nova Multimodal Embeddings, and creates Document + Embedding rows.
    """
    # Save file to disk
    patient_dir = UPLOAD_DIR / patient_id
    patient_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename).name  # strip any path traversal
    file_path = patient_dir / safe_name

    # Limit upload to 1 MB
    content = file.file.read(1_048_576 + 1)
    if len(content) > 1_048_576:
        raise HTTPException(status_code=413, detail="File too large (max 1 MB)")
    with open(file_path, "wb") as f:
        f.write(content)

    # Read text content (UTF-8)
    try:
        text_content = content.decode("utf-8")
    except UnicodeDecodeError:
        text_content = content.decode("latin-1")

    # Run ingest pipeline
    doc = ingest_document(
        db=db,
        patient_id=patient_id,
        filename=file.filename,
        content=text_content,
        file_path=str(file_path),
    )

    return {
        "id": doc.id,
        "filename": doc.filename,
        "patient_id": doc.patient_id,
        "file_type": doc.file_type,
        "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
    }


@router.get("/patient/{patient_id}")
def list_patient_documents(
    patient_id: str,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """List all documents for a specific patient."""
    docs = db.query(Document).filter(Document.patient_id == patient_id).all()
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "patient_id": doc.patient_id,
            "file_type": doc.file_type,
            "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
        }
        for doc in docs
    ]


@router.get("/{document_id}")
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Get a single document with metadata and extracted text."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": doc.id,
        "filename": doc.filename,
        "patient_id": doc.patient_id,
        "file_type": doc.file_type,
        "file_path": doc.file_path,
        "extracted_text": doc.extracted_text,
        "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
    }
