"""BidiAgent factory for voice sessions via Nova 2 Sonic.

Creates a NEW BidiAgent instance per call -- each WebSocket connection
needs its own agent because Nova Sonic connections are stateful and per-session.
"""

from strands.experimental.bidi import BidiAgent
from strands.experimental.bidi.models.nova_sonic import BidiNovaSonicModel

from backend.agents.tools import (
    get_patient,
    list_patients,
    admit_patient,
    update_patient,
    prescribe_medication,
    administer_medication,
    get_patient_documents,
    search_records,
)

VOICE_SYSTEM_PROMPT = """You are NovaHealth AI, a nursing assistant at a hospital.

You help nurses manage patients efficiently. You are friendly, concise, and
speak in plain language without medical jargon. You have access to patient
records and can look up patients, list patients by status, admit new patients,
update patient information, prescribe medications, administer medications with
allergy safety checks, retrieve patient documents, and search across records.

Keep responses brief since they will be spoken aloud. Avoid markdown formatting,
bullet lists, or table output -- speak naturally. When presenting patient data,
summarize the key points conversationally rather than listing fields.

Address the nurse by name (Sarah) when appropriate."""


def create_voice_agent() -> BidiAgent:
    """Create a new BidiAgent instance for a voice session.

    Each WebSocket connection should call this to get its own agent.
    Do NOT reuse agents across connections.
    """
    from backend.config import AWS_REGION

    model = BidiNovaSonicModel(
        model_id="amazon.nova-2-sonic-v1:0",
        client_config={"region": AWS_REGION},
    )
    return BidiAgent(
        model=model,
        tools=[
            get_patient,
            list_patients,
            admit_patient,
            update_patient,
            prescribe_medication,
            administer_medication,
            get_patient_documents,
            search_records,
        ],
        system_prompt=VOICE_SYSTEM_PROMPT,
    )
