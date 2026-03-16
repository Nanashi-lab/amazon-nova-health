"""Patient service tests -- CRUD operations via the API."""

import pytest
from fastapi.testclient import TestClient

from backend.database import get_db
from backend.main import app
from backend.models.patient import Patient
from backend.models.user import User
from backend.services.auth import get_current_user, hash_password


@pytest.fixture
def patient_client(test_db):
    """Test client with DB override and auth bypass."""
    # Seed a user
    user = User(
        id="U-TEST", email="test@nova.ai", name="Test",
        password_hash=hash_password("pass"), role="nurse",
    )
    test_db.add(user)
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


def _seed_patient(db, pid="P001"):
    """Insert a test patient directly."""
    p = Patient(
        id=pid, name="Margaret Chen", age=72, gender="F",
        room=f"10{pid[-1]}", status="critical",
        condition="Post-cardiac surgery", admitted_date="2026-03-10",
        vitals={"heartRate": 92, "bloodPressure": "135/85", "oxygenSat": 94, "temperature": 99.1},
        allergies=["Penicillin"], attending_physician="Dr. Williams",
    )
    db.add(p)
    db.commit()
    return p


def test_create_patient(patient_client):
    """PTNT-01: Create a new patient record via API."""
    response = patient_client.post("/api/patients/", json={
        "name": "New Patient",
        "age": 40,
        "gender": "M",
        "room": "999",
        "status": "stable",
        "condition": "Flu",
        "allergies": [],
        "attendingPhysician": "Dr. Test",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Patient"
    assert data["room"] == "999"
    assert data["id"].startswith("P")


def test_get_patient(patient_client, test_db):
    """PTNT-03: Retrieve a patient by ID."""
    _seed_patient(test_db)
    response = patient_client.get("/api/patients/P001")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Margaret Chen"
    assert data["status"] == "critical"


def test_list_patients_filter(patient_client, test_db):
    """PTNT-04: List patients with optional status filter."""
    _seed_patient(test_db, "P001")
    p2 = Patient(
        id="P002", name="James Wilson", age=45, gender="M",
        room="202", status="stable", condition="Appendectomy",
        admitted_date="2026-03-12", vitals={"heartRate": 72, "bloodPressure": "120/80", "oxygenSat": 98, "temperature": 98.6},
        allergies=[], attending_physician="Dr. Smith",
    )
    test_db.add(p2)
    test_db.commit()

    # All patients
    response = patient_client.get("/api/patients/")
    assert response.status_code == 200
    assert response.json()["total"] == 2

    # Filter by status
    response = patient_client.get("/api/patients/?status_filter=critical")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["patients"][0]["name"] == "Margaret Chen"


def test_update_patient(patient_client, test_db):
    """PTNT-05: Update patient fields (vitals, status, etc.)."""
    _seed_patient(test_db)
    response = patient_client.patch("/api/patients/P001", json={
        "status": "stable",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "stable"
