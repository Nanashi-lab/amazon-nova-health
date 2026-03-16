"""Patient model -- mirrors frontend Patient interface."""

from sqlalchemy import Column, String, Integer, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True)  # "P001" format
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(1), nullable=False)  # "M" or "F"
    room = Column(String, nullable=False, unique=True)
    status = Column(String, nullable=False)  # critical/caution/stable/monitoring
    condition = Column(String, nullable=False)
    admitted_date = Column(String, nullable=False)  # ISO date string
    vitals = Column(JSON, nullable=False)
    allergies = Column(JSON, default=list)
    attending_physician = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    medications = relationship(
        "Medication", back_populates="patient", cascade="all, delete-orphan"
    )
