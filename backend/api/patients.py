"""Patient REST endpoints -- CRUD operations."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.user import User
from backend.schemas.patient import (
    PatientCreate,
    PatientListResponse,
    PatientResponse,
    PatientUpdate,
)
from backend.services.auth import get_current_user
from backend.services.patient import (
    create_patient,
    get_patient_by_id,
    list_patients,
    patient_to_response,
    update_patient,
)

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create(
    body: PatientCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Create a new patient."""
    patient = create_patient(db, body)
    return patient_to_response(patient)


@router.get("/", response_model=PatientListResponse)
def list_all(
    status_filter: Optional[str] = None,
    condition: Optional[str] = None,
    room: Optional[str] = None,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """List patients with optional filters."""
    patients = list_patients(db, status=status_filter, condition=condition, room=room)
    return {
        "patients": [patient_to_response(p) for p in patients],
        "total": len(patients),
    }


@router.get("/{patient_id}", response_model=PatientResponse)
def get_one(
    patient_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get a single patient by ID."""
    patient = get_patient_by_id(db, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {patient_id} not found",
        )
    return patient_to_response(patient)


@router.patch("/{patient_id}", response_model=PatientResponse)
def patch(
    patient_id: str,
    body: PatientUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Update specified fields on a patient."""
    patient = update_patient(db, patient_id, body)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {patient_id} not found",
        )
    return patient_to_response(patient)
