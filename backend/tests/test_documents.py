"""Document upload and ingest pipeline tests -- DOCS-01, DOCS-03.

Tests the document ingest service and upload API endpoint.
All Nova Embeddings API calls are mocked.
"""

import io
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.database import get_db
from backend.services.auth import create_access_token


@pytest.fixture
def auth_headers():
    """Generate valid JWT auth headers for test requests."""
    token = create_access_token("U001", "nurse@novahealth.ai")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def mock_bedrock():
    """Mock boto3 bedrock-runtime invoke_model to return a fake 1024-dim embedding."""
    fake_response_body = json.dumps({
        "embeddings": [{"embedding": [0.1] * 1024}]
    }).encode("utf-8")

    mock_body = MagicMock()
    mock_body.read.return_value = fake_response_body

    mock_client = MagicMock()
    mock_client.invoke_model.return_value = {"body": mock_body}

    with patch("backend.services.document_service.bedrock", mock_client):
        yield mock_client


def test_ingest_pipeline(mock_bedrock):
    """DOCS-03: ingest_document() stores Document + Embedding rows, mocking boto3."""
    from backend.models.document import Document, Embedding
    from backend.services.document_service import ingest_document

    # Mock the session to track what gets added (avoids pgvector/SQLite incompatibility)
    mock_session = MagicMock()
    mock_session.flush = MagicMock()
    mock_session.commit = MagicMock()

    # Track what gets added
    added_objects = []
    def track_add(obj):
        added_objects.append(obj)
        if isinstance(obj, Document):
            obj.id = 1  # Simulate autoincrement
    mock_session.add = track_add

    doc = ingest_document(
        db=mock_session,
        patient_id="P001",
        filename="test-report.md",
        content="Patient shows elevated white blood cell count.",
        file_path="/data/uploads/P001/test-report.md",
    )

    # Assert Document row created
    assert isinstance(doc, Document)
    assert doc.patient_id == "P001"
    assert doc.filename == "test-report.md"
    assert doc.file_type == "text"
    assert doc.extracted_text == "Patient shows elevated white blood cell count."

    # Assert Embedding row created
    assert len(added_objects) == 2
    emb = added_objects[1]
    assert isinstance(emb, Embedding)
    assert emb.document_id == 1
    assert emb.patient_id == "P001"
    assert emb.content_type == "document"
    assert emb.vector == [0.1] * 1024

    # Assert bedrock was called
    mock_bedrock.invoke_model.assert_called_once()
    call_kwargs = mock_bedrock.invoke_model.call_args
    assert "amazon.nova-2-multimodal-embeddings-v1:0" in str(call_kwargs)

    # Assert session was committed
    mock_session.flush.assert_called_once()
    mock_session.commit.assert_called_once()


def test_upload_document(test_client_with_db, test_db, auth_headers):
    """DOCS-01: POST /api/documents/upload with multipart form data returns 200."""
    # Seed a user for auth validation
    from backend.models.user import User
    from backend.services.auth import hash_password
    user = User(
        id="U001",
        email="nurse@novahealth.ai",
        name="Sarah",
        password_hash=hash_password("nova2026"),
        role="nurse",
    )
    test_db.add(user)

    # Seed a patient for FK
    from backend.models.patient import Patient
    patient = Patient(
        id="P001", name="Test Patient", age=45, gender="M",
        room="101", condition="Test", status="stable", admitted_date="2026-03-10",
        vitals={"heartRate": 72}, attending_physician="Dr. Test",
    )
    test_db.add(patient)
    test_db.commit()

    # Mock ingest_document to avoid real embedding calls
    from backend.models.document import Document
    fake_doc = Document(
        id=1, patient_id="P001", filename="report.txt",
        file_type="text", file_path="/uploads/P001/report.txt",
        extracted_text="test content",
    )

    with patch("backend.api.documents.ingest_document", return_value=fake_doc):
        response = test_client_with_db.post(
            "/api/documents/upload",
            files={"file": ("report.txt", io.BytesIO(b"test content"), "text/plain")},
            data={"patient_id": "P001"},
            headers=auth_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["filename"] == "report.txt"
    assert data["patient_id"] == "P001"


def test_upload_requires_auth(client):
    """Upload without token returns 401."""
    response = client.post(
        "/api/documents/upload",
        files={"file": ("report.txt", io.BytesIO(b"test"), "text/plain")},
        data={"patient_id": "P001"},
    )
    assert response.status_code == 401


def test_upload_requires_patient_id(test_client_with_db, test_db, auth_headers):
    """Upload without patient_id returns 422."""
    # Seed user for auth
    from backend.models.user import User
    from backend.services.auth import hash_password
    user = User(
        id="U001", email="nurse@novahealth.ai", name="Sarah",
        password_hash=hash_password("nova2026"), role="nurse",
    )
    test_db.add(user)
    test_db.commit()

    response = test_client_with_db.post(
        "/api/documents/upload",
        files={"file": ("report.txt", io.BytesIO(b"test"), "text/plain")},
        headers=auth_headers,
    )
    assert response.status_code == 422
