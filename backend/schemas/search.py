"""Search request/response Pydantic schemas."""

from pydantic import BaseModel


class SearchResponse(BaseModel):
    id: str
    type: str
    title: str
    snippet: str
    relevanceScore: float = 1.0
    patientName: str | None = None
    date: str


class SearchListResponse(BaseModel):
    results: list[SearchResponse]
    total: int
