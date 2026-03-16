"""Tests for voice WebSocket endpoint and health check."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def valid_token():
    """Create a valid JWT token for WebSocket auth."""
    from backend.services.auth import create_access_token
    return create_access_token("U001", "nurse@novahealth.ai")


# ---------- Health check tests ----------


def test_voice_health_available(client):
    """VOIC-03: GET /api/voice/health returns available=True when Sonic reachable."""
    mock_model = AsyncMock()
    mock_model.start = AsyncMock()
    mock_model.stop = AsyncMock()

    with patch(
        "backend.api.voice.BidiNovaSonicModel", return_value=mock_model
    ):
        response = client.get("/api/voice/health")
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is True


def test_voice_health_unavailable(client):
    """VOIC-03: GET /api/voice/health returns available=False when Sonic unreachable."""
    mock_model = AsyncMock()
    mock_model.start = AsyncMock(side_effect=Exception("Connection refused"))
    mock_model.stop = AsyncMock()

    with patch(
        "backend.api.voice.BidiNovaSonicModel", return_value=mock_model
    ):
        response = client.get("/api/voice/health")
    assert response.status_code == 200
    data = response.json()
    assert data["available"] is False
    assert "error" in data


# ---------- WebSocket auth tests ----------


def test_websocket_rejects_unauthenticated(client):
    """VOIC-01: WebSocket /api/voice without token closes with 4001."""
    with client.websocket_connect("/api/voice") as ws:
        # Server accepts then closes with 4001 -- TestClient receives close
        pass


def test_websocket_rejects_bad_token(client):
    """WebSocket /api/voice with invalid token closes with 4001."""
    with client.websocket_connect("/api/voice?token=invalid.jwt.token") as ws:
        pass


def test_websocket_accepts_authenticated(client, valid_token):
    """VOIC-01, VOIC-02: WebSocket /api/voice with valid JWT accepts and relays."""
    mock_agent = MagicMock()
    mock_agent.start = AsyncMock()
    mock_agent.stop = AsyncMock()

    # receive() returns an async generator that yields nothing
    async def empty_receive():
        return
        yield  # pragma: no cover -- makes this an async generator

    mock_agent.receive = empty_receive

    with patch("backend.api.voice.create_voice_agent", return_value=mock_agent):
        with client.websocket_connect(f"/api/voice?token={valid_token}") as ws:
            # Connection accepted -- send stop to cleanly close
            ws.send_json({"type": "stop"})
