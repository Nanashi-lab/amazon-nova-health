"""Document ingest pipeline -- store file, generate Nova embedding, index in pgvector."""

import json
from pathlib import Path

import boto3
from sqlalchemy.orm import Session

from backend.config import AWS_REGION
from backend.models.document import Document, Embedding

UPLOAD_DIR = Path("backend/data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

bedrock = boto3.client("bedrock-runtime", region_name=AWS_REGION)


def get_embedding(text: str, purpose: str = "GENERIC_INDEX") -> list[float]:
    """Generate 1024-dim embedding via Nova Multimodal Embeddings.

    Args:
        text: The text content to embed.
        purpose: GENERIC_INDEX for documents, GENERIC_RETRIEVAL for search queries.
    """
    body = json.dumps({
        "schemaVersion": "nova-multimodal-embed-v1",
        "taskType": "SINGLE_EMBEDDING",
        "singleEmbeddingParams": {
            "embeddingPurpose": purpose,
            "embeddingDimension": 1024,
            "text": {
                "truncationMode": "END",
                "value": text,
            },
        },
    })
    response = bedrock.invoke_model(
        modelId="amazon.nova-2-multimodal-embeddings-v1:0",
        body=body,
        contentType="application/json",
        accept="application/json",
    )
    result = json.loads(response["body"].read())
    return result["embeddings"][0]["embedding"]


def ingest_document(
    db: Session,
    patient_id: str,
    filename: str,
    content: str,
    file_path: str,
) -> Document:
    """Full ingest pipeline: store metadata, generate embedding, index.

    1. Creates a Document row with file metadata and extracted text.
    2. Generates a 1024-dim embedding via Nova Multimodal Embeddings.
    3. Creates an Embedding row with the vector for semantic search.
    """
    # 1. Create Document record
    doc = Document(
        patient_id=patient_id,
        filename=filename,
        file_type="text",
        file_path=file_path,
        extracted_text=content,
    )
    db.add(doc)
    db.flush()  # get doc.id

    # 2. Generate embedding
    vector = get_embedding(content, purpose="GENERIC_INDEX")

    # 3. Store embedding
    emb = Embedding(
        document_id=doc.id,
        patient_id=patient_id,
        content_type="document",
        content_text=content[:500],  # store snippet for search results
        vector=vector,
    )
    db.add(emb)
    db.commit()

    return doc
