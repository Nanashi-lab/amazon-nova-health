"""Patient request/response Pydantic schemas -- matches frontend Patient interface."""

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class VitalsSchema(BaseModel):
    heart_rate: int = Field(alias="heartRate")
    blood_pressure: str = Field(alias="bloodPressure")
    oxygen_sat: int = Field(alias="oxygenSat")
    temperature: float

    model_config = ConfigDict(populate_by_name=True)


class MedicationResponse(BaseModel):
    name: str
    dosage: str
    last_administered: str = Field(alias="lastAdministered")
    frequency: str

    model_config = ConfigDict(populate_by_name=True)


class PatientResponse(BaseModel):
    id: str
    name: str
    age: int
    gender: Literal["M", "F"]
    room: str
    status: str
    condition: str
    admitted_date: str = Field(alias="admittedDate")
    vitals: VitalsSchema
    medications: list[MedicationResponse]
    allergies: list[str]
    attending_physician: str = Field(alias="attendingPhysician")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PatientCreate(BaseModel):
    name: str
    age: int
    gender: Literal["M", "F"]
    room: str
    status: str = "stable"
    condition: str
    vitals: Optional[VitalsSchema] = None
    allergies: list[str] = []
    attending_physician: str = Field(alias="attendingPhysician")

    model_config = ConfigDict(populate_by_name=True)


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Literal["M", "F"]] = None
    room: Optional[str] = None
    status: Optional[str] = None
    condition: Optional[str] = None
    vitals: Optional[VitalsSchema] = None
    allergies: Optional[list[str]] = None
    attending_physician: Optional[str] = Field(default=None, alias="attendingPhysician")

    model_config = ConfigDict(populate_by_name=True)


class PatientListResponse(BaseModel):
    patients: list[PatientResponse]
    total: int
