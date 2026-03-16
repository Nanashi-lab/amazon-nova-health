"""Import all models so Base.metadata.create_all sees them."""

from backend.models.user import User
from backend.models.patient import Patient
from backend.models.medication import Medication, MedicationLog
from backend.models.document import Document, Embedding
from backend.models.chat import ChatSession, ChatMessage

__all__ = [
    "User",
    "Patient",
    "Medication",
    "MedicationLog",
    "Document",
    "Embedding",
    "ChatSession",
    "ChatMessage",
]
