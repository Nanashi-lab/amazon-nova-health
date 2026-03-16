"""Medication REST endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.auth import get_current_user
from backend.schemas.medication import (
    AdministerRequest,
    AdministerResponse,
    MedicationResponse,
    PrescriptionCreate,
)
from backend.services.medication import (
    add_prescription,
    log_administration,
    remove_prescription,
)

router = APIRouter(prefix="/api", tags=["medications"])


@router.post(
    "/patients/{patient_id}/medications",
    response_model=MedicationResponse,
    status_code=201,
)
def create_prescription(
    patient_id: str,
    data: PrescriptionCreate,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Add a new prescription to a patient."""
    med = add_prescription(db, patient_id, data)
    return MedicationResponse(
        id=med.id,
        patientId=med.patient_id,
        name=med.name,
        dosage=med.dosage,
        frequency=med.frequency,
        active=med.active,
        prescribedAt=str(med.prescribed_at) if med.prescribed_at else "",
    )


@router.delete("/medications/{medication_id}", response_model=MedicationResponse)
def delete_medication(
    medication_id: int,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Soft-delete a medication (set active=False)."""
    med = remove_prescription(db, medication_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    return MedicationResponse(
        id=med.id,
        patientId=med.patient_id,
        name=med.name,
        dosage=med.dosage,
        frequency=med.frequency,
        active=med.active,
        prescribedAt=str(med.prescribed_at) if med.prescribed_at else "",
    )


@router.post(
    "/medications/{medication_id}/administer",
    response_model=AdministerResponse,
    status_code=201,
)
def administer_medication(
    medication_id: int,
    data: AdministerRequest,
    db: Session = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Log a medication administration event."""
    log = log_administration(db, medication_id, data.administered_by, data.notes)
    return AdministerResponse(
        id=log.id,
        medication_id=log.medication_id,
        administered_at=str(log.administered_at),
        administered_by=log.administered_by,
        notes=log.notes,
    )
