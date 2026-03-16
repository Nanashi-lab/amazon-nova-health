"""Seed data tests -- validates patients, medications, and document seeding.

Tests for DATA-01 through DATA-04.
"""

import re
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from backend.data.seed import SEED_DOCUMENTS_DIR, SEED_PATIENTS, seed_db, seed_documents
from backend.models.medication import Medication
from backend.models.patient import Patient


def test_seed_patients(test_db):
    """DATA-01: Seed script creates 12 patients with realistic data."""
    seed_db(test_db)
    patients = test_db.query(Patient).all()
    assert len(patients) == 12

    # Verify a known patient
    p001 = test_db.query(Patient).filter(Patient.id == "P001").first()
    assert p001 is not None
    assert p001.name == "Margaret Chen"
    assert p001.status == "critical"

    # Verify all statuses are valid
    valid_statuses = {"critical", "caution", "stable", "monitoring"}
    for p in patients:
        assert p.status in valid_statuses


def test_seed_medications(test_db):
    """DATA-02: Seed script creates medications for each patient."""
    seed_db(test_db)
    medications = test_db.query(Medication).all()
    assert len(medications) > 0

    # Every patient should have at least one medication
    patient_ids_with_meds = {m.patient_id for m in medications}
    all_patient_ids = {p["id"] for p in SEED_PATIENTS}
    assert patient_ids_with_meds == all_patient_ids


def test_seed_documents_exist():
    """DATA-03: Seed document files exist in backend/data/seed_documents/."""
    assert SEED_DOCUMENTS_DIR.exists(), f"Directory missing: {SEED_DOCUMENTS_DIR}"

    md_files = list(SEED_DOCUMENTS_DIR.glob("*.md"))
    assert len(md_files) >= 40, f"Expected >= 40 .md files, found {len(md_files)}"

    # Check naming convention: {patient_id}_{doc_type}_{number}.md
    pattern = re.compile(r"^P\d{3}_(doctor_note|lab_report|nursing_assessment)_\d+\.md$")
    for md_file in md_files:
        assert pattern.match(md_file.name), (
            f"File {md_file.name} does not match naming convention"
        )

    # Check that all 12 patient IDs have at least one document
    patient_ids = {p["id"] for p in SEED_PATIENTS}
    file_patient_ids = {f.stem.split("_")[0] for f in md_files}
    missing = patient_ids - file_patient_ids
    assert not missing, f"Missing documents for patients: {missing}"


def test_seed_documents_indexed(test_db):
    """DATA-04: seed_documents() function processes files through ingest pipeline."""
    # First seed patients so foreign keys work
    seed_db(test_db)

    md_files = sorted(SEED_DOCUMENTS_DIR.glob("*.md"))
    assert len(md_files) > 0, "No seed document files found for test"

    with patch("backend.services.document_service.ingest_document") as mock_ingest:
        # Make ingest_document return a mock Document
        mock_ingest.return_value = MagicMock()

        seed_documents(test_db)

        # Assert ingest_document was called once per file
        assert mock_ingest.call_count == len(md_files), (
            f"Expected {len(md_files)} ingest calls, got {mock_ingest.call_count}"
        )

        # Verify patient_id argument matches filename prefix for each call
        for call_args in mock_ingest.call_args_list:
            kwargs = call_args.kwargs if call_args.kwargs else {}
            # Could be positional or keyword args
            if kwargs:
                patient_id = kwargs["patient_id"]
                filename = kwargs["filename"]
            else:
                # positional: db, patient_id, filename, content, file_path
                patient_id = call_args.args[1]
                filename = call_args.args[2]

            expected_pid = filename.split("_")[0]
            assert patient_id == expected_pid, (
                f"patient_id mismatch: {patient_id} != {expected_pid} for {filename}"
            )


def test_seed_documents_idempotent(test_db):
    """seed_documents() skips if documents already exist."""
    seed_db(test_db)

    # First call: should process files
    with patch("backend.services.document_service.ingest_document") as mock_ingest:
        mock_ingest.return_value = MagicMock()
        seed_documents(test_db)
        first_count = mock_ingest.call_count

    # There are now Document rows in the DB from the first call... but wait,
    # we mocked ingest_document so no actual Documents were created.
    # The idempotency check queries Document count, so with mocked ingest,
    # no docs were actually inserted. That means second call would also run.
    # This is expected since we're mocking -- the real idempotency works
    # when ingest_document actually creates Document rows.
    # Test the check directly instead:
    from backend.models.document import Document

    # Manually add a Document to simulate existing data
    doc = Document(
        patient_id="P001",
        filename="test.md",
        file_type="text",
        file_path="/tmp/test.md",
        extracted_text="test",
    )
    test_db.add(doc)
    test_db.commit()

    with patch("backend.services.document_service.ingest_document") as mock_ingest:
        seed_documents(test_db)
        assert mock_ingest.call_count == 0, "Should skip when documents already exist"
