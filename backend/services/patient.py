"""Patient CRUD service -- create, read, update, list with filters."""

from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from backend.models.patient import Patient
from backend.models.medication import Medication
from backend.schemas.patient import PatientCreate, PatientUpdate


def _next_patient_id(db: Session) -> str:
    """Generate next patient ID in P{NNN} format."""
    result = db.query(func.max(Patient.id)).scalar()
    if result is None:
        return "P001"
    num = int(result[1:]) + 1
    return f"P{num:03d}"


def create_patient(db: Session, data: PatientCreate) -> Patient:
    """Create a new patient with auto-generated ID."""
    patient_id = _next_patient_id(db)
    vitals_dict = data.vitals.model_dump(by_alias=True) if data.vitals else {
        "heartRate": 72, "bloodPressure": "120/80", "oxygenSat": 98, "temperature": 98.6
    }
    patient = Patient(
        id=patient_id,
        name=data.name,
        age=data.age,
        gender=data.gender,
        room=data.room,
        status=data.status,
        condition=data.condition,
        admitted_date=date.today().isoformat(),
        vitals=vitals_dict,
        allergies=data.allergies,
        attending_physician=data.attending_physician,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def get_patient_by_id(db: Session, patient_id: str) -> Patient | None:
    """Get a single patient by primary key, eager-loading medications."""
    return (
        db.query(Patient)
        .options(joinedload(Patient.medications).joinedload(Medication.logs))
        .filter(Patient.id == patient_id)
        .first()
    )


def get_patient_by_name(db: Session, name: str) -> list[Patient]:
    """Search patients by name (case-insensitive partial match)."""
    return (
        db.query(Patient)
        .options(joinedload(Patient.medications).joinedload(Medication.logs))
        .filter(Patient.name.ilike(f"%{name}%"))
        .all()
    )


def get_patient_by_room(db: Session, room: str) -> Patient | None:
    """Get a patient by exact room number."""
    return (
        db.query(Patient)
        .options(joinedload(Patient.medications).joinedload(Medication.logs))
        .filter(Patient.room == room)
        .first()
    )


def list_patients(
    db: Session,
    status: str | None = None,
    condition: str | None = None,
    room: str | None = None,
) -> list[Patient]:
    """List patients with optional filters."""
    query = db.query(Patient).options(
        joinedload(Patient.medications).joinedload(Medication.logs)
    )
    if status:
        query = query.filter(Patient.status == status)
    if condition:
        query = query.filter(Patient.condition.ilike(f"%{condition}%"))
    if room:
        query = query.filter(Patient.room == room)
    return query.all()


def update_patient(db: Session, patient_id: str, data: PatientUpdate) -> Patient | None:
    """Update specified fields on a patient. Returns None if not found."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        return None

    update_data = data.model_dump(exclude_unset=True, by_alias=False)
    for field, value in update_data.items():
        if field == "vitals" and value is not None:
            # Store vitals as camelCase dict in JSON column
            setattr(patient, field, data.vitals.model_dump(by_alias=True))
        else:
            setattr(patient, field, value)

    db.commit()
    db.refresh(patient)
    return patient


def patient_to_response(patient: Patient) -> dict:
    """Transform a Patient ORM instance into a dict matching the frontend Patient interface.

    Handles:
    - snake_case -> camelCase field mapping
    - Medication relationship -> frontend medication shape with lastAdministered
    """
    medications = []
    for med in patient.medications:
        if not med.active:
            continue
        # Determine lastAdministered from most recent log or prescribed_at
        last_admin = med.prescribed_at.isoformat() if med.prescribed_at else ""
        if med.logs:
            most_recent = max(med.logs, key=lambda log: log.administered_at)
            last_admin = most_recent.administered_at.isoformat()
        medications.append({
            "name": med.name,
            "dosage": med.dosage,
            "lastAdministered": last_admin,
            "frequency": med.frequency,
        })

    return {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "room": patient.room,
        "status": patient.status,
        "condition": patient.condition,
        "admittedDate": patient.admitted_date,
        "vitals": patient.vitals,
        "medications": medications,
        "allergies": patient.allergies or [],
        "attendingPhysician": patient.attending_physician,
    }
