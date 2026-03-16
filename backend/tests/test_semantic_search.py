"""Semantic search tests -- SRCH-01.

Tests the semantic search service, search endpoint mode parameter,
and agent search_records tool with semantic mode.
All Nova Embeddings API calls and pgvector queries are mocked.
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.services.auth import create_access_token


@pytest.fixture
def auth_headers():
    """Generate valid JWT auth headers for test requests."""
    token = create_access_token("U001", "nurse@novahealth.ai")
    return {"Authorization": f"Bearer {token}"}


def test_semantic_search():
    """SRCH-01: semantic_search() returns ranked results with relevanceScore."""
    fake_results = [
        {
            "id": "1",
            "type": "document",
            "title": "lab-report-p001.md",
            "snippet": "Elevated white blood cell count at 12.5 x10^9/L",
            "relevanceScore": 0.85,
            "patientName": "Margaret Chen",
            "date": "2026-03-10T00:00:00",
        },
        {
            "id": "2",
            "type": "document",
            "title": "nursing-assessment-p003.md",
            "snippet": "Patient reports joint pain and fatigue",
            "relevanceScore": 0.62,
            "patientName": "Robert Kim",
            "date": "2026-03-11T00:00:00",
        },
    ]

    with patch("backend.services.semantic_search.get_embedding", return_value=[0.1] * 1024):
        with patch("backend.services.semantic_search._run_vector_query", return_value=fake_results):
            from backend.services.semantic_search import semantic_search

            mock_db = MagicMock()
            results = semantic_search(mock_db, "elevated white blood cell")

    assert len(results) == 2
    # Results should be ranked by relevance (highest first)
    assert results[0]["relevanceScore"] >= results[1]["relevanceScore"]
    # Each result should have required fields
    for r in results:
        assert "id" in r
        assert "type" in r
        assert "title" in r
        assert "snippet" in r
        assert "relevanceScore" in r
        assert "patientName" in r
        assert "date" in r


def test_semantic_search_endpoint(test_client_with_db, test_db, auth_headers):
    """GET /api/search?q=...&mode=semantic returns results via API."""
    # Seed user for auth
    from backend.models.user import User
    from backend.services.auth import hash_password
    user = User(
        id="U001", email="nurse@novahealth.ai", name="Sarah",
        password_hash=hash_password("nova2026"), role="nurse",
    )
    test_db.add(user)
    test_db.commit()

    fake_results = [
        {
            "id": "1",
            "type": "document",
            "title": "lab-report.md",
            "snippet": "WBC elevated",
            "relevanceScore": 0.9,
            "patientName": "Test Patient",
            "date": "2026-03-10",
        }
    ]

    with patch("backend.api.search.semantic_search", return_value=fake_results):
        response = test_client_with_db.get(
            "/api/search?q=elevated&mode=semantic",
            headers=auth_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["results"][0]["relevanceScore"] == 0.9
    assert data["results"][0]["type"] == "document"


def test_search_records_tool_semantic():
    """Agent's search_records tool with mode='semantic' returns semantically ranked results."""
    fake_results = [
        {
            "id": "1",
            "type": "document",
            "title": "report.md",
            "snippet": "Test content",
            "relevanceScore": 0.8,
            "patientName": "Test",
            "date": "2026-03-10",
        }
    ]

    # Mock SessionLocal to avoid real DB, and semantic_search at the module where it's imported
    mock_db = MagicMock()
    with patch("backend.agents.tools.SessionLocal", return_value=mock_db):
        with patch("backend.services.semantic_search.semantic_search", return_value=fake_results):
            from backend.agents.tools import search_records
            result = search_records(query="test query", mode="semantic")

    assert result["mode"] == "semantic"
    assert result["count"] == 1
    assert len(result["results"]) == 1
    assert result["results"][0]["relevanceScore"] == 0.8
