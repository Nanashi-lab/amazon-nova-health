"""Medication service tests -- add, remove, administer via API."""

import pytest
from fastapi.testclient import TestClient

from backend.database import get_db
from backend.main import app
from backend.models.medication import Medication
from backend.models.patient import Patient
from backend.models.user import User
from backend.services.auth import get_current_user, hash_password


@pytest.fixture
def med_client(test_db):
    """Test client with DB override, auth bypass, and a seeded patient."""
    user = User(
        id="U-TEST", email="test@nova.ai", name="Test",
        password_hash=hash_password("pass"), role="nurse",
    )
    test_db.add(user)
    patient = Patient(
        id="P001", name="Margaret Chen", age=72, gender="F",
        room="101", status="critical", condition="Post-cardiac surgery",
        admitted_date="2026-03-10",
        vitals={"heartRate": 92, "bloodPressure": "135/85", "oxygenSat": 94, "temperature": 99.1},
        allergies=["Penicillin"], attending_physician="Dr. Williams",
    )
    test_db.add(patient)
    test_db.commit()

    class FakeUser:
        id = "U-TEST"
        email = "test@nova.ai"
        name = "Test"
        role = "nurse"

    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = lambda: FakeUser()
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_add_medication(med_client):
    """MEDS-01: Add a medication to a patient."""
    response = med_client.post("/api/patients/P001/medications", json={
        "name": "Lisinopril",
        "dosage": "10mg",
        "frequency": "Once daily",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Lisinopril"
    assert data["active"] is True
    assert data["patientId"] == "P001"


def test_remove_medication(med_client, test_db):
    """MEDS-02: Remove (soft-delete) a medication."""
    med = Medication(
        patient_id="P001", name="Lisinopril", dosage="10mg",
        frequency="Once daily", active=True,
    )
    test_db.add(med)
    test_db.commit()
    test_db.refresh(med)

    response = med_client.delete(f"/api/medications/{med.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["active"] is False


def test_administer(med_client, test_db):
    """MEDS-03: Log medication administration event."""
    med = Medication(
        patient_id="P001", name="Lisinopril", dosage="10mg",
        frequency="Once daily", active=True,
    )
    test_db.add(med)
    test_db.commit()
    test_db.refresh(med)

    response = med_client.post(f"/api/medications/{med.id}/administer", json={
        "administered_by": "Nurse Sarah",
        "notes": "Administered with food",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["medication_id"] == med.id
    assert data["administered_by"] == "Nurse Sarah"
    assert data["notes"] == "Administered with food"
