"""Auth service tests -- login, token validation, /me endpoint."""

import pytest
from fastapi.testclient import TestClient

from backend.database import get_db
from backend.main import app
from backend.models.user import User
from backend.services.auth import create_access_token, hash_password


@pytest.fixture
def auth_client(test_db):
    """Test client with DB override and a seeded user."""
    user = User(
        id="U-TEST",
        email="nurse@novahealth.ai",
        name="Sarah",
        password_hash=hash_password("nova2026"),
        role="nurse",
    )
    test_db.add(user)
    test_db.commit()

    def override_get_db():
        try:
            yield test_db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


def test_login_success(auth_client):
    """AUTH-01: Valid credentials return JWT token."""
    response = auth_client.post(
        "/api/auth/login",
        json={"email": "nurse@novahealth.ai", "password": "nova2026"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid(auth_client):
    """AUTH-01: Invalid credentials return 401."""
    response = auth_client.post(
        "/api/auth/login",
        json={"email": "nurse@novahealth.ai", "password": "wrongpass"},
    )
    assert response.status_code == 401


def test_me_valid_token(auth_client):
    """AUTH-02: GET /me with valid token returns user info."""
    # First login to get token
    login_resp = auth_client.post(
        "/api/auth/login",
        json={"email": "nurse@novahealth.ai", "password": "nova2026"},
    )
    token = login_resp.json()["access_token"]

    response = auth_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "nurse@novahealth.ai"
    assert data["name"] == "Sarah"
    assert data["role"] == "nurse"
