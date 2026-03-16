"""Seed script -- populates database with 12 realistic patients and medications.

Idempotent: skips if data already exists. Called on FastAPI startup.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from backend.models.document import Document
from backend.models.medication import Medication, MedicationLog
from backend.models.patient import Patient

SEED_DOCUMENTS_DIR = Path(__file__).parent / "seed_documents"

# 12 patients: 2 critical, 3 caution, 5 stable, 2 monitoring
SEED_PATIENTS = [
    # --- P001-P008: Based on mock_patients.py ---
    {
        "id": "P001",
        "name": "Margaret Chen",
        "age": 72,
        "gender": "F",
        "room": "101",
        "status": "critical",
        "condition": "Acute Myocardial Infarction",
        "admitted_date": "2026-03-08",
        "vitals": {
            "heartRate": 112,
            "bloodPressure": "90/58",
            "oxygenSat": 89,
            "temperature": 99.1,
        },
        "allergies": ["Penicillin", "Sulfa drugs"],
        "attending_physician": "Dr. James Rodriguez",
    },
    {
        "id": "P002",
        "name": "Robert Williams",
        "age": 65,
        "gender": "M",
        "room": "203",
        "status": "critical",
        "condition": "Congestive Heart Failure",
        "admitted_date": "2026-03-10",
        "vitals": {
            "heartRate": 98,
            "bloodPressure": "85/55",
            "oxygenSat": 91,
            "temperature": 98.6,
        },
        "allergies": ["Aspirin"],
        "attending_physician": "Dr. Emily Park",
    },
    {
        "id": "P003",
        "name": "Sarah Johnson",
        "age": 45,
        "gender": "F",
        "room": "312",
        "status": "stable",
        "condition": "Post-op Recovery (Appendectomy)",
        "admitted_date": "2026-03-12",
        "vitals": {
            "heartRate": 74,
            "bloodPressure": "120/78",
            "oxygenSat": 98,
            "temperature": 98.4,
        },
        "allergies": [],
        "attending_physician": "Dr. Michael Torres",
    },
    {
        "id": "P004",
        "name": "James Thompson",
        "age": 58,
        "gender": "M",
        "room": "415",
        "status": "caution",
        "condition": "Pneumonia",
        "admitted_date": "2026-03-11",
        "vitals": {
            "heartRate": 88,
            "bloodPressure": "135/85",
            "oxygenSat": 93,
            "temperature": 101.2,
        },
        "allergies": ["Codeine"],
        "attending_physician": "Dr. Lisa Nguyen",
    },
    {
        "id": "P005",
        "name": "Dorothy Miller",
        "age": 81,
        "gender": "F",
        "room": "508",
        "status": "monitoring",
        "condition": "Hip Fracture (post-surgical)",
        "admitted_date": "2026-03-09",
        "vitals": {
            "heartRate": 70,
            "bloodPressure": "128/76",
            "oxygenSat": 96,
            "temperature": 98.8,
        },
        "allergies": ["Latex"],
        "attending_physician": "Dr. David Kim",
    },
    {
        "id": "P006",
        "name": "William Davis",
        "age": 34,
        "gender": "M",
        "room": "220",
        "status": "stable",
        "condition": "Diabetic Ketoacidosis (recovering)",
        "admitted_date": "2026-03-12",
        "vitals": {
            "heartRate": 78,
            "bloodPressure": "118/72",
            "oxygenSat": 99,
            "temperature": 98.2,
        },
        "allergies": [],
        "attending_physician": "Dr. James Rodriguez",
    },
    {
        "id": "P007",
        "name": "Linda Garcia",
        "age": 67,
        "gender": "F",
        "room": "334",
        "status": "monitoring",
        "condition": "COPD Exacerbation",
        "admitted_date": "2026-03-13",
        "vitals": {
            "heartRate": 82,
            "bloodPressure": "140/88",
            "oxygenSat": 92,
            "temperature": 99.0,
        },
        "allergies": ["Erythromycin", "Ibuprofen"],
        "attending_physician": "Dr. Lisa Nguyen",
    },
    {
        "id": "P008",
        "name": "Thomas Anderson",
        "age": 52,
        "gender": "M",
        "room": "402",
        "status": "stable",
        "condition": "Cellulitis (left lower extremity)",
        "admitted_date": "2026-03-13",
        "vitals": {
            "heartRate": 72,
            "bloodPressure": "122/80",
            "oxygenSat": 98,
            "temperature": 99.4,
        },
        "allergies": [],
        "attending_physician": "Dr. Emily Park",
    },
    # --- P009-P012: New patients ---
    {
        "id": "P009",
        "name": "Maria Santos",
        "age": 28,
        "gender": "F",
        "room": "145",
        "status": "stable",
        "condition": "Post-op Recovery (Cesarean Section)",
        "admitted_date": "2026-03-13",
        "vitals": {
            "heartRate": 76,
            "bloodPressure": "115/70",
            "oxygenSat": 99,
            "temperature": 98.6,
        },
        "allergies": [],
        "attending_physician": "Dr. Michael Torres",
    },
    {
        "id": "P010",
        "name": "Harold Mitchell",
        "age": 55,
        "gender": "M",
        "room": "267",
        "status": "caution",
        "condition": "Acute Pancreatitis",
        "admitted_date": "2026-03-12",
        "vitals": {
            "heartRate": 94,
            "bloodPressure": "142/90",
            "oxygenSat": 95,
            "temperature": 100.4,
        },
        "allergies": ["Morphine"],
        "attending_physician": "Dr. David Kim",
    },
    {
        "id": "P011",
        "name": "Patricia Evans",
        "age": 40,
        "gender": "F",
        "room": "318",
        "status": "stable",
        "condition": "Urinary Tract Infection",
        "admitted_date": "2026-03-13",
        "vitals": {
            "heartRate": 80,
            "bloodPressure": "125/78",
            "oxygenSat": 98,
            "temperature": 100.1,
        },
        "allergies": [],
        "attending_physician": "Dr. Emily Park",
    },
    {
        "id": "P012",
        "name": "George Hawkins",
        "age": 75,
        "gender": "M",
        "room": "450",
        "status": "caution",
        "condition": "Atrial Fibrillation",
        "admitted_date": "2026-03-11",
        "vitals": {
            "heartRate": 110,
            "bloodPressure": "148/92",
            "oxygenSat": 94,
            "temperature": 98.4,
        },
        "allergies": ["Amiodarone"],
        "attending_physician": "Dr. James Rodriguez",
    },
]

# Medications per patient: name, dosage, frequency
SEED_MEDICATIONS: dict[str, list[dict]] = {
    "P001": [
        {"name": "Heparin", "dosage": "5000 units IV", "frequency": "q12h"},
        {"name": "Nitroglycerin", "dosage": "0.4 mg SL", "frequency": "PRN"},
        {"name": "Aspirin", "dosage": "81 mg PO", "frequency": "daily"},
    ],
    "P002": [
        {"name": "Furosemide", "dosage": "40 mg IV", "frequency": "q8h"},
        {"name": "Lisinopril", "dosage": "10 mg PO", "frequency": "daily"},
    ],
    "P003": [
        {"name": "Acetaminophen", "dosage": "500 mg PO", "frequency": "q6h PRN"},
        {"name": "Cefazolin", "dosage": "1 g IV", "frequency": "q8h"},
    ],
    "P004": [
        {"name": "Azithromycin", "dosage": "500 mg IV", "frequency": "daily"},
        {"name": "Albuterol", "dosage": "2.5 mg nebulizer", "frequency": "q4h PRN"},
        {"name": "Acetaminophen", "dosage": "650 mg PO", "frequency": "q6h PRN"},
    ],
    "P005": [
        {"name": "Enoxaparin", "dosage": "40 mg SC", "frequency": "daily"},
        {"name": "Morphine", "dosage": "2 mg IV", "frequency": "q4h PRN"},
    ],
    "P006": [
        {"name": "Insulin glargine", "dosage": "20 units SC", "frequency": "daily"},
        {"name": "Normal Saline", "dosage": "1000 mL IV", "frequency": "continuous"},
        {"name": "Metformin", "dosage": "500 mg PO", "frequency": "BID"},
    ],
    "P007": [
        {"name": "Prednisone", "dosage": "40 mg PO", "frequency": "daily"},
        {"name": "Ipratropium", "dosage": "0.5 mg nebulizer", "frequency": "q6h"},
        {"name": "Supplemental O2", "dosage": "2 L/min nasal cannula", "frequency": "continuous"},
    ],
    "P008": [
        {"name": "Vancomycin", "dosage": "1 g IV", "frequency": "q12h"},
        {"name": "Ibuprofen", "dosage": "400 mg PO", "frequency": "q6h PRN"},
    ],
    "P009": [
        {"name": "Ibuprofen", "dosage": "400 mg PO", "frequency": "q6h PRN"},
        {"name": "Oxytocin", "dosage": "10 units IV", "frequency": "post-delivery"},
        {"name": "Cefazolin", "dosage": "2 g IV", "frequency": "q8h"},
    ],
    "P010": [
        {"name": "Hydromorphone", "dosage": "0.5 mg IV", "frequency": "q4h PRN"},
        {"name": "Pantoprazole", "dosage": "40 mg IV", "frequency": "daily"},
        {"name": "Normal Saline", "dosage": "1000 mL IV", "frequency": "continuous"},
    ],
    "P011": [
        {"name": "Ciprofloxacin", "dosage": "500 mg PO", "frequency": "BID"},
        {"name": "Phenazopyridine", "dosage": "200 mg PO", "frequency": "TID"},
    ],
    "P012": [
        {"name": "Warfarin", "dosage": "5 mg PO", "frequency": "daily"},
        {"name": "Metoprolol", "dosage": "25 mg PO", "frequency": "BID"},
        {"name": "Digoxin", "dosage": "0.125 mg PO", "frequency": "daily"},
    ],
}


def seed_db(db: Session) -> None:
    """Seed the database with 12 patients and their medications.

    Idempotent: skips if patients already exist.
    """
    patient_count = db.query(Patient).count()
    if patient_count > 0:
        print("Database already seeded, skipping")
        return

    now = datetime.now(timezone.utc)
    total_meds = 0

    for pdata in SEED_PATIENTS:
        patient = Patient(**pdata)
        db.add(patient)

    db.flush()  # ensure patients are in session before adding medications

    for patient_id, meds in SEED_MEDICATIONS.items():
        for mdata in meds:
            med = Medication(
                patient_id=patient_id,
                name=mdata["name"],
                dosage=mdata["dosage"],
                frequency=mdata["frequency"],
                active=True,
            )
            db.add(med)
            db.flush()  # get med.id for logs

            # Create 1-2 administration logs per medication
            for hours_ago in [6, 18]:
                if hours_ago == 18 and len(meds) > 2:
                    # Only add second log for patients with 2 meds
                    continue
                log = MedicationLog(
                    medication_id=med.id,
                    administered_at=now - timedelta(hours=hours_ago),
                    administered_by="Nurse Sarah",
                    notes=None,
                )
                db.add(log)

            total_meds += 1

    db.commit()
    print(f"Seeded {len(SEED_PATIENTS)} patients with {total_meds} medications")


def seed_documents(db: Session) -> None:
    """Index seed document markdown files through the ingest pipeline.

    Idempotent: skips if documents already exist in the database.
    Requires Nova Embeddings API to be available.
    """
    doc_count = db.query(Document).count()
    if doc_count > 0:
        print(f"Documents already seeded ({doc_count} docs), skipping")
        return

    if not SEED_DOCUMENTS_DIR.exists():
        print(f"Seed documents directory not found: {SEED_DOCUMENTS_DIR}")
        return

    import backend.services.document_service as doc_svc

    md_files = sorted(SEED_DOCUMENTS_DIR.glob("*.md"))
    if not md_files:
        print("No seed document files found")
        return

    indexed = 0
    failed = 0
    for md_file in md_files:
        # Parse patient_id from filename: P001_doctor_note_1.md -> P001
        patient_id = md_file.stem.split("_")[0]
        content = md_file.read_text(encoding="utf-8")

        try:
            doc_svc.ingest_document(
                db=db,
                patient_id=patient_id,
                filename=md_file.name,
                content=content,
                file_path=str(md_file),
            )
            indexed += 1
        except Exception as e:
            print(f"Warning: Failed to index {md_file.name}: {e}")
            failed += 1

    print(f"Seeded {indexed} documents with embeddings ({failed} failed)")
