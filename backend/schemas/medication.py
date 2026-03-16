"""Medication request/response Pydantic schemas."""

from pydantic import BaseModel, ConfigDict, Field


class PrescriptionCreate(BaseModel):
    name: str
    dosage: str
    frequency: str


class AdministerRequest(BaseModel):
    administered_by: str = "Nurse Sarah"
    notes: str | None = None


class MedicationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    patient_id: str = Field(alias="patientId")
    name: str
    dosage: str
    frequency: str
    active: bool
    prescribed_at: str = Field(alias="prescribedAt")


class AdministerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    medication_id: int
    administered_at: str
    administered_by: str
    notes: str | None = None
