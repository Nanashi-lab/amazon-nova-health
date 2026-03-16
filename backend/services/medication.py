"""Medication service -- CRUD and administration logging."""

from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from backend.models.medication import Medication, MedicationLog
from backend.models.patient import Patient
from backend.schemas.medication import PrescriptionCreate


def add_prescription(
    db: Session, patient_id: str, data: PrescriptionCreate
) -> Medication:
    """Add a new prescription to a patient."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {patient_id} not found")

    medication = Medication(
        patient_id=patient_id,
        name=data.name,
        dosage=data.dosage,
        frequency=data.frequency,
    )
    db.add(medication)
    db.commit()
    db.refresh(medication)
    return medication


def remove_prescription(db: Session, medication_id: int) -> Medication | None:
    """Soft-delete a medication by setting active=False."""
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        return None
    medication.active = False
    db.commit()
    db.refresh(medication)
    return medication


def log_administration(
    db: Session,
    medication_id: int,
    administered_by: str,
    notes: str | None = None,
) -> MedicationLog:
    """Log a medication administration event."""
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(status_code=404, detail=f"Medication {medication_id} not found")
    if not medication.active:
        raise HTTPException(
            status_code=400, detail=f"Medication {medication_id} is inactive"
        )

    log = MedicationLog(
        medication_id=medication_id,
        administered_at=datetime.now(timezone.utc),
        administered_by=administered_by,
        notes=notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_patient_medications(
    db: Session, patient_id: str, active_only: bool = True
) -> list[Medication]:
    """Get all medications for a patient, optionally filtered to active only."""
    query = db.query(Medication).filter(Medication.patient_id == patient_id)
    if active_only:
        query = query.filter(Medication.active.is_(True))
    return query.all()
