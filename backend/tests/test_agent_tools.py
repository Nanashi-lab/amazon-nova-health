"""Tests for agent tool functions with mocked DB sessions.

Each tool creates its own SessionLocal(), so we patch that to return
the test_db fixture session.
"""

from unittest.mock import patch

import pytest

from backend.models.patient import Patient
from backend.models.medication import Medication
from backend.models.document import Document


def _seed_patient(db, patient_id="P001", name="Margaret Chen", allergies=None, room="101"):
    """Helper to insert a test patient."""
    patient = Patient(
        id=patient_id,
        name=name,
        age=72,
        gender="F",
        room=room,
        status="critical",
        condition="Post-cardiac surgery",
        admitted_date="2026-03-10",
        vitals={"heartRate": 92, "bloodPressure": "135/85", "oxygenSat": 94, "temperature": 99.1},
        allergies=allergies or [],
        attending_physician="Dr. Williams",
    )
    db.add(patient)
    db.commit()
    return patient


def _seed_medication(db, patient_id="P001", name="Lisinopril", dosage="10mg", frequency="Once daily"):
    """Helper to insert a test medication."""
    med = Medication(
        patient_id=patient_id,
        name=name,
        dosage=dosage,
        frequency=frequency,
    )
    db.add(med)
    db.commit()
    db.refresh(med)
    return med


def _seed_document(db, patient_id="P001", filename="lab_report.md", content="Blood glucose: 95 mg/dL"):
    """Helper to insert a test document."""
    doc = Document(
        patient_id=patient_id,
        filename=filename,
        file_type="text",
        file_path=f"/fake/{filename}",
        extracted_text=content,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@pytest.fixture
def mock_session(test_db):
    """Patch SessionLocal in tools module to return test_db session."""
    with patch("backend.agents.tools.SessionLocal", return_value=test_db):
        yield test_db


# ---------------------------------------------------------------------------
# get_patient
# ---------------------------------------------------------------------------


def test_get_patient_by_id(mock_session):
    """get_patient returns patient dict for a valid ID."""
    _seed_patient(mock_session)

    from backend.agents.tools import get_patient

    result = get_patient(patient_id="P001")
    assert result["name"] == "Margaret Chen"
    assert result["room"] == "101"
    assert result["status"] == "critical"
    assert "vitals" in result
    assert result["vitals"]["heartRate"] == 92


def test_get_patient_by_name(mock_session):
    """get_patient returns patient dict when searched by name."""
    _seed_patient(mock_session)

    from backend.agents.tools import get_patient

    result = get_patient(name="Margaret")
    assert result["name"] == "Margaret Chen"
    assert result["id"] == "P001"


def test_get_patient_by_room(mock_session):
    """get_patient returns patient dict when searched by room."""
    _seed_patient(mock_session)

    from backend.agents.tools import get_patient

    result = get_patient(room="101")
    assert result["name"] == "Margaret Chen"


def test_get_patient_not_found(mock_session):
    """get_patient returns error dict for an invalid ID."""
    from backend.agents.tools import get_patient

    result = get_patient(patient_id="INVALID")
    assert "error" in result
    assert "INVALID" in result["error"]


def test_get_patient_no_args(mock_session):
    """get_patient returns error when called with no arguments."""
    from backend.agents.tools import get_patient

    result = get_patient()
    assert "error" in result


# ---------------------------------------------------------------------------
# list_patients
# ---------------------------------------------------------------------------


def test_list_patients_all(mock_session):
    """list_patients with no filter returns all patients with count."""
    _seed_patient(mock_session, "P001", "Margaret Chen")
    p2 = Patient(
        id="P002", name="James Wilson", age=45, gender="M",
        room="202", status="stable", condition="Appendectomy",
        admitted_date="2026-03-12", vitals={}, allergies=[],
        attending_physician="Dr. Smith",
    )
    mock_session.add(p2)
    mock_session.commit()

    from backend.agents.tools import list_patients

    result = list_patients()
    assert "patients" in result
    assert "count" in result
    assert result["count"] == 2
    assert len(result["patients"]) == 2


def test_list_patients_filtered(mock_session):
    """list_patients with status_filter returns only matching patients."""
    _seed_patient(mock_session, "P001", "Margaret Chen")
    p2 = Patient(
        id="P002", name="James Wilson", age=45, gender="M",
        room="202", status="stable", condition="Appendectomy",
        admitted_date="2026-03-12", vitals={}, allergies=[],
        attending_physician="Dr. Smith",
    )
    mock_session.add(p2)
    mock_session.commit()

    from backend.agents.tools import list_patients

    result = list_patients(status_filter="critical")
    assert result["count"] == 1
    assert result["patients"][0]["name"] == "Margaret Chen"


# ---------------------------------------------------------------------------
# admit_patient
# ---------------------------------------------------------------------------


def test_admit_patient(mock_session):
    """admit_patient creates a patient and returns response."""
    from backend.agents.tools import admit_patient

    result = admit_patient(
        name="Test Patient",
        age=30,
        gender="M",
        room="301",
        condition="Flu",
        status="stable",
        allergies=["Aspirin"],
        attending_physician="Dr. Test",
    )
    assert result["name"] == "Test Patient"
    assert result["room"] == "301"
    assert result["allergies"] == ["Aspirin"]
    assert result["id"] == "P001"


def test_admit_patient_default_vitals(mock_session):
    """admit_patient sets default vitals when none provided."""
    from backend.agents.tools import admit_patient

    result = admit_patient(
        name="Jane Doe",
        age=25,
        gender="F",
        room="110",
        condition="Observation",
        attending_physician="Dr. Smith",
    )
    assert result["vitals"]["heartRate"] == 72
    assert result["vitals"]["bloodPressure"] == "120/80"
    assert result["vitals"]["oxygenSat"] == 98


def test_admit_patient_duplicate_room(mock_session):
    """admit_patient returns error when room is already occupied."""
    _seed_patient(mock_session, room="101")

    from backend.agents.tools import admit_patient

    result = admit_patient(
        name="Another Patient",
        age=40,
        gender="M",
        room="101",
        condition="Flu",
        attending_physician="Dr. Test",
    )
    assert "error" in result


# ---------------------------------------------------------------------------
# update_patient
# ---------------------------------------------------------------------------


def test_update_patient_status(mock_session):
    """update_patient changes patient status."""
    _seed_patient(mock_session)

    from backend.agents.tools import update_patient

    result = update_patient(patient_id="P001", status="stable")
    assert result["status"] == "stable"


def test_update_patient_not_found(mock_session):
    """update_patient returns error for invalid patient ID."""
    from backend.agents.tools import update_patient

    result = update_patient(patient_id="INVALID", status="stable")
    assert "error" in result


def test_update_patient_no_fields(mock_session):
    """update_patient returns error when no fields provided."""
    _seed_patient(mock_session)

    from backend.agents.tools import update_patient

    result = update_patient(patient_id="P001")
    assert "error" in result
    assert "No fields" in result["error"]


# ---------------------------------------------------------------------------
# prescribe_medication
# ---------------------------------------------------------------------------


def test_prescribe_medication(mock_session):
    """prescribe_medication adds a medication and returns success."""
    _seed_patient(mock_session)

    from backend.agents.tools import prescribe_medication

    result = prescribe_medication(
        patient_id="P001",
        medication_name="Amoxicillin",
        dosage="500mg",
        frequency="Every 8 hours",
    )
    assert result["success"] is True
    assert "Amoxicillin" in result["message"]
    assert "medication_id" in result


def test_prescribe_medication_invalid_patient(mock_session):
    """prescribe_medication returns error for non-existent patient."""
    from backend.agents.tools import prescribe_medication

    result = prescribe_medication(
        patient_id="INVALID",
        medication_name="Amoxicillin",
        dosage="500mg",
        frequency="Daily",
    )
    assert "error" in result


# ---------------------------------------------------------------------------
# administer_medication
# ---------------------------------------------------------------------------


def test_administer_medication_success(mock_session):
    """administer_medication logs normally when no allergy conflict exists."""
    _seed_patient(mock_session, "P001", "Margaret Chen", allergies=["Sulfa"])
    _seed_medication(mock_session, "P001", "Lisinopril", "10mg", "Once daily")

    from backend.agents.tools import administer_medication

    result = administer_medication(patient_id="P001", medication_name="Lisinopril")
    assert result["success"] is True
    assert result["notes"] is None
    assert "administered_at" in result


def test_administer_medication_allergy_warning(mock_session):
    """administer_medication returns allergy warning when conflict detected."""
    _seed_patient(mock_session, "P001", "Margaret Chen", allergies=["Penicillin"])
    _seed_medication(mock_session, "P001", "Penicillin V", "500mg", "Every 6 hours")

    from backend.agents.tools import administer_medication

    result = administer_medication(patient_id="P001", medication_name="Penicillin V")
    assert "warning" in result
    assert result["requires_confirmation"] is True
    assert result["allergy"] == "Penicillin"
    assert "ALLERGY ALERT" in result["warning"]


def test_administer_medication_allergy_override(mock_session):
    """administer_medication with override_confirmed=True logs despite allergy."""
    _seed_patient(mock_session, "P001", "Margaret Chen", allergies=["Penicillin"])
    _seed_medication(mock_session, "P001", "Penicillin V", "500mg", "Every 6 hours")

    from backend.agents.tools import administer_medication

    result = administer_medication(
        patient_id="P001", medication_name="Penicillin V", override_confirmed=True
    )
    assert result["success"] is True
    assert "Allergy override" in (result["notes"] or "")


def test_administer_medication_no_prescription(mock_session):
    """administer_medication returns error when medication not prescribed."""
    _seed_patient(mock_session, "P001", "Margaret Chen")

    from backend.agents.tools import administer_medication

    result = administer_medication(patient_id="P001", medication_name="Aspirin")
    assert "error" in result
    assert "No active prescription" in result["error"]


def test_administer_medication_patient_not_found(mock_session):
    """administer_medication returns error for non-existent patient."""
    from backend.agents.tools import administer_medication

    result = administer_medication(patient_id="INVALID", medication_name="Aspirin")
    assert "error" in result


# ---------------------------------------------------------------------------
# get_patient_documents
# ---------------------------------------------------------------------------


def test_get_patient_documents(mock_session):
    """get_patient_documents returns documents for a patient."""
    _seed_patient(mock_session)
    _seed_document(mock_session, "P001", "lab_report.md", "Blood glucose: 95 mg/dL")
    _seed_document(mock_session, "P001", "doctor_note.md", "Patient recovering well.")

    from backend.agents.tools import get_patient_documents

    result = get_patient_documents(patient_id="P001")
    assert result["count"] == 2
    assert result["patient_name"] == "Margaret Chen"
    assert len(result["documents"]) == 2
    filenames = [d["filename"] for d in result["documents"]]
    assert "lab_report.md" in filenames
    assert "doctor_note.md" in filenames


def test_get_patient_documents_with_summary(mock_session):
    """get_patient_documents includes text summary from extracted_text."""
    _seed_patient(mock_session)
    _seed_document(mock_session, "P001", "lab.md", "Hemoglobin: 14.2 g/dL, WBC: 7500")

    from backend.agents.tools import get_patient_documents

    result = get_patient_documents(patient_id="P001")
    assert result["documents"][0]["summary"] == "Hemoglobin: 14.2 g/dL, WBC: 7500"


def test_get_patient_documents_empty(mock_session):
    """get_patient_documents returns empty list when no documents exist."""
    _seed_patient(mock_session)

    from backend.agents.tools import get_patient_documents

    result = get_patient_documents(patient_id="P001")
    assert result["count"] == 0
    assert result["documents"] == []


def test_get_patient_documents_not_found(mock_session):
    """get_patient_documents returns error for non-existent patient."""
    from backend.agents.tools import get_patient_documents

    result = get_patient_documents(patient_id="INVALID")
    assert "error" in result


# ---------------------------------------------------------------------------
# search_records
# ---------------------------------------------------------------------------


def test_search_records(mock_session):
    """search_records calls simple_search and returns results."""
    _seed_patient(mock_session, "P001", "Margaret Chen")

    from backend.agents.tools import search_records

    result = search_records(query="Margaret")
    assert "results" in result
    assert result["count"] >= 1
    assert result["results"][0]["title"] == "Margaret Chen"


def test_search_records_no_results(mock_session):
    """search_records returns empty results for non-matching query."""
    from backend.agents.tools import search_records

    result = search_records(query="nonexistent")
    assert result["count"] == 0
    assert result["results"] == []
