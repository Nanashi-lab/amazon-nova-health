"""Search REST endpoint -- supports simple (ILIKE) and semantic (Nova Embeddings) modes."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.services.auth import get_current_user
from backend.schemas.search import SearchListResponse, SearchResponse
from backend.services.search import simple_search
from backend.services.semantic_search import semantic_search

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search", response_model=SearchListResponse)
def search_patients(
    q: str = Query(..., min_length=1, description="Search query string"),
    mode: str = Query("simple", pattern="^(simple|semantic)$", description="Search mode"),
    db: Session = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Search patients and documents.

    mode=simple: ILIKE search across patient name, room, condition, physician, medications.
    mode=semantic: AI-powered semantic search using Nova Embeddings + pgvector cosine similarity.
    """
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")

    if mode == "semantic":
        results = semantic_search(db, q.strip())
    else:
        results = simple_search(db, q.strip())

    return SearchListResponse(
        results=[SearchResponse(**r) for r in results],
        total=len(results),
    )
