"""Medication and MedicationLog models."""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database import Base


class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    frequency = Column(String, nullable=False)
    active = Column(Boolean, default=True)
    prescribed_at = Column(DateTime, server_default=func.now())

    patient = relationship("Patient", back_populates="medications")
    logs = relationship(
        "MedicationLog", back_populates="medication", cascade="all, delete-orphan"
    )


class MedicationLog(Base):
    __tablename__ = "medication_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_id = Column(Integer, ForeignKey("medications.id"), nullable=False)
    administered_at = Column(DateTime, nullable=False)
    administered_by = Column(String, nullable=False)
    notes = Column(String, nullable=True)

    medication = relationship("Medication", back_populates="logs")
