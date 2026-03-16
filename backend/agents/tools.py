"""Agent tools wired to real database services.

8 tools available to the Strands agent:
- get_patient: Look up a patient by ID, name, or room
- list_patients: List patients with optional status/condition filters
- admit_patient: Create a new patient record
- update_patient: Update patient fields (status, vitals, etc.)
- prescribe_medication: Add a medication prescription
- administer_medication: Log medication administration with allergy safety check
- get_patient_documents: List documents and clinical notes for a patient
- search_records: Search across patient records and documents
"""

from typing import Optional

from strands import tool

from backend.database import SessionLocal
from backend.models.document import Document
from backend.services.patient import (
    create_patient,
    get_patient_by_id,
    get_patient_by_name,
    get_patient_by_room,
    list_patients as svc_list_patients,
    update_patient as svc_update_patient,
    patient_to_response,
)
from backend.services.medication import (
    add_prescription as svc_add_prescription,
    log_administration,
    get_patient_medications,
)
from backend.services.search import simple_search
from backend.schemas.patient import PatientCreate, PatientUpdate
from backend.schemas.medication import PrescriptionCreate


@tool
def get_patient(
    patient_id: str = "",
    name: str = "",
    room: str = "",
) -> dict:
    """Retrieve detailed information about a specific patient including
    their vitals, medications, allergies, and current status.

    Args:
        patient_id: The unique patient identifier, e.g. 'P001', 'P002'
        name: Patient name to search for (partial match)
        room: Room number to look up
    """
    db = SessionLocal()
    try:
        if patient_id:
            patient = get_patient_by_id(db, patient_id)
            if not patient:
                return {"error": f"No patient found with ID {patient_id}"}
            return patient_to_response(patient)
        elif name:
            patients = get_patient_by_name(db, name)
            if not patients:
                return {"error": f"No patient found matching name '{name}'"}
            if len(patients) == 1:
                return patient_to_response(patients[0])
            return {
                "patients": [patient_to_response(p) for p in patients],
                "count": len(patients),
                "message": f"Found {len(patients)} patients matching '{name}'",
            }
        elif room:
            patient = get_patient_by_room(db, room)
            if not patient:
                return {"error": f"No patient found in room {room}"}
            return patient_to_response(patient)
        else:
            return {"error": "Please provide a patient_id, name, or room to look up."}
    finally:
        db.close()


@tool
def list_patients(
    status_filter: Optional[str] = None,
    condition: Optional[str] = None,
) -> dict:
    """List all current patients, optionally filtered by their status or condition.

    Args:
        status_filter: Filter by patient status. Valid values: critical,
            caution, stable, monitoring. Omit to return all patients.
        condition: Filter by medical condition (partial match).
    """
    db = SessionLocal()
    try:
        results = svc_list_patients(db, status=status_filter, condition=condition)
        return {
            "patients": [patient_to_response(p) for p in results],
            "count": len(results),
        }
    finally:
        db.close()


@tool
def admit_patient(
    name: str,
    age: int,
    gender: str,
    room: str,
    condition: str,
    status: str = "stable",
    allergies: Optional[list] = None,
    attending_physician: str = "",
) -> dict:
    """Admit a new patient to the hospital.

    Args:
        name: Patient's full name
        age: Patient's age in years
        gender: Must be 'M' or 'F'
        room: Room number to assign
        condition: Primary medical condition/diagnosis
        status: Initial status (stable, caution, critical, monitoring)
        allergies: List of known allergies
        attending_physician: Name of attending physician
    """
    db = SessionLocal()
    try:
        data = PatientCreate(
            name=name,
            age=age,
            gender=gender,
            room=room,
            condition=condition,
            status=status,
            allergies=allergies or [],
            attendingPhysician=attending_physician,
        )
        patient = create_patient(db, data)
        return patient_to_response(patient)
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()


@tool
def update_patient(
    patient_id: str,
    status: Optional[str] = None,
    condition: Optional[str] = None,
    vitals: Optional[dict] = None,
    allergies: Optional[list] = None,
    attending_physician: Optional[str] = None,
) -> dict:
    """Update a patient's information.

    Args:
        patient_id: The unique patient identifier
        status: New status (stable, caution, critical, monitoring)
        condition: Updated medical condition/diagnosis
        vitals: Updated vitals dict with keys: heartRate, bloodPressure, oxygenSat, temperature
        allergies: Updated list of allergies
        attending_physician: Updated attending physician name
    """
    db = SessionLocal()
    try:
        update_fields = {}
        if status is not None:
            update_fields["status"] = status
        if condition is not None:
            update_fields["condition"] = condition
        if vitals is not None:
            update_fields["vitals"] = vitals
        if allergies is not None:
            update_fields["allergies"] = allergies
        if attending_physician is not None:
            update_fields["attendingPhysician"] = attending_physician

        if not update_fields:
            return {"error": "No fields provided to update."}

        data = PatientUpdate(**update_fields)
        patient = svc_update_patient(db, patient_id, data)
        if not patient:
            return {"error": f"No patient found with ID {patient_id}"}
        return patient_to_response(patient)
    finally:
        db.close()


@tool
def prescribe_medication(
    patient_id: str,
    medication_name: str,
    dosage: str,
    frequency: str,
) -> dict:
    """Prescribe a new medication for a patient.

    Args:
        patient_id: The unique patient identifier
        medication_name: Name of the medication
        dosage: Dosage amount and unit (e.g. '500mg', '10mL')
        frequency: How often to administer (e.g. 'Every 8 hours', 'Once daily')
    """
    db = SessionLocal()
    try:
        data = PrescriptionCreate(
            name=medication_name,
            dosage=dosage,
            frequency=frequency,
        )
        medication = svc_add_prescription(db, patient_id, data)
        return {
            "success": True,
            "message": f"Prescribed {medication_name} {dosage} ({frequency}) for patient {patient_id}.",
            "medication_id": medication.id,
            "patient_id": patient_id,
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()


@tool
def administer_medication(
    patient_id: str,
    medication_name: str,
    override_confirmed: bool = False,
) -> dict:
    """Administer a medication to a patient. Checks for allergy conflicts first.

    If an allergy conflict is detected, returns a warning and requires the nurse
    to confirm before proceeding. Call again with override_confirmed=True to proceed.

    Args:
        patient_id: The unique patient identifier
        medication_name: Name of the medication to administer
        override_confirmed: Set to True to override an allergy warning
    """
    db = SessionLocal()
    try:
        patient = get_patient_by_id(db, patient_id)
        if not patient:
            return {"error": f"No patient found with ID {patient_id}"}

        # Allergy safety check
        conflict = None
        if patient.allergies:
            for allergy in patient.allergies:
                if allergy.lower() in medication_name.lower() or medication_name.lower() in allergy.lower():
                    conflict = allergy
                    break

        if conflict and not override_confirmed:
            return {
                "warning": (
                    f"ALLERGY ALERT: Patient {patient.name} has a known allergy to "
                    f"'{conflict}'. The medication '{medication_name}' may cause an "
                    f"adverse reaction. Please confirm with the nurse before proceeding."
                ),
                "requires_confirmation": True,
                "allergy": conflict,
                "patient_name": patient.name,
            }

        # Find matching active medication
        medications = get_patient_medications(db, patient_id, active_only=True)
        target = None
        for med in medications:
            if med.name.lower() == medication_name.lower():
                target = med
                break

        if not target:
            return {
                "error": f"No active prescription for '{medication_name}' found for patient {patient_id}. "
                "Please prescribe the medication first.",
            }

        # Log the administration
        notes = f"Allergy override: {conflict}" if conflict else None
        log = log_administration(db, target.id, "Nurse Sarah", notes=notes)
        return {
            "success": True,
            "message": f"Medication '{medication_name}' administered to {patient.name}.",
            "log_id": log.id,
            "administered_at": log.administered_at.isoformat(),
            "notes": notes,
        }
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()


@tool
def get_patient_documents(
    patient_id: str,
) -> dict:
    """Retrieve all documents and clinical notes for a patient, including
    doctor notes, lab reports, and uploaded files.

    Args:
        patient_id: The unique patient identifier
    """
    db = SessionLocal()
    try:
        patient = get_patient_by_id(db, patient_id)
        if not patient:
            return {"error": f"No patient found with ID {patient_id}"}

        docs = db.query(Document).filter(Document.patient_id == patient_id).all()
        if not docs:
            return {
                "message": f"No documents found for patient {patient.name} ({patient_id}).",
                "documents": [],
                "count": 0,
            }

        documents = []
        for doc in docs:
            documents.append({
                "id": doc.id,
                "filename": doc.filename,
                "file_type": doc.file_type,
                "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                "summary": doc.extracted_text[:200] if doc.extracted_text else None,
            })

        return {
            "patient_name": patient.name,
            "patient_id": patient_id,
            "documents": documents,
            "count": len(documents),
        }
    finally:
        db.close()


@tool
def search_records(query: str, mode: str = "simple") -> dict:
    """Search across patient records, medications, conditions, and documents.

    Args:
        query: Search term to look for across all patient records
        mode: Search mode - "simple" for DB filter, "semantic" for AI-powered semantic search
    """
    db = SessionLocal()
    try:
        if mode == "semantic":
            from backend.services.semantic_search import semantic_search
            results = semantic_search(db, query)
        else:
            results = simple_search(db, query)
        return {
            "results": results,
            "count": len(results),
            "query": query,
            "mode": mode,
        }
    finally:
        db.close()
