import pytest
import uuid
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import User
from app.db.session import SessionLocal

client = TestClient(app)

def test_google_auth_missing_payload():
    """Ensure missing tokens return 400 Bad Request"""
    response = client.post("/api/v1/auth/google", json={})
    assert response.status_code == 400
    assert "Google ID token, credential, or access token is required" in response.json()["detail"]

def test_google_auth_invalid_token():
    """Ensure invalid Google token returns 401 Unauthorized"""
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_get.return_value = mock_response

        response = client.post("/api/v1/auth/google", json={"id_token": "invalid_token"})
        assert response.status_code == 401
        assert "Invalid or expired Google authentication credentials" in response.json()["detail"]

def test_google_auth_new_user_creation():
    """Test full flow: verify Google token, create new user, issue session"""
    test_sub = f"google-test-sub-{uuid.uuid4().hex[:8]}"
    test_email = f"newuser-{uuid.uuid4().hex[:6]}@example.com"

    mock_google_profile = {
        "iss": "https://accounts.google.com",
        "sub": test_sub,
        "email": test_email,
        "email_verified": True,
        "name": "Jane Google",
        "picture": "https://lh3.googleusercontent.com/a/test-avatar"
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_google_profile
        mock_get.return_value = mock_response

        response = client.post("/api/v1/auth/google", json={"credential": "valid_mock_jwt"})
        assert response.status_code == 200
        data = response.json()
        assert "user" in data
        assert "token" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["google_id"] == test_sub
        assert data["user"]["name"] == "Jane Google"
        assert data["user"]["auth_provider"] == "google"
        assert data["token"].startswith("landos-jwt-")

        # Verify persisted in database
        db = SessionLocal()
        try:
            db_user = db.query(User).filter(User.google_id == test_sub).first()
            assert db_user is not None
            assert db_user.email == test_email
        finally:
            db.close()

def test_google_auth_existing_account_linking():
    """Test safe account linking: existing user without google_id gets linked upon Google sign-in"""
    test_email = f"existing-{uuid.uuid4().hex[:6]}@example.com"
    test_sub = f"google-sub-link-{uuid.uuid4().hex[:8]}"

    db = SessionLocal()
    try:
        # Pre-seed user registered via normal email
        existing_user = User(
            id=str(uuid.uuid4()),
            email=test_email,
            name="Existing Customer",
            role="admin",
            auth_provider="email",
            email_verified=False
        )
        db.add(existing_user)
        db.commit()
    finally:
        db.close()

    mock_google_profile = {
        "iss": "https://accounts.google.com",
        "sub": test_sub,
        "email": test_email,
        "email_verified": True,
        "name": "Existing Customer",
        "picture": "https://lh3.googleusercontent.com/a/test-avatar"
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_google_profile
        mock_get.return_value = mock_response

        response = client.post("/api/v1/auth/google", json={"id_token": "valid_token"})
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == test_email
        assert data["user"]["google_id"] == test_sub
        assert data["user"]["auth_provider"] == "google"
        assert data["user"]["email_verified"] is True

        # Verify updated in database
        db = SessionLocal()
        try:
            linked_user = db.query(User).filter(User.email == test_email).first()
            assert linked_user is not None
            assert linked_user.google_id == test_sub
            assert linked_user.email_verified is True
        finally:
            db.close()

def test_google_auth_access_token_flow():
    """Test verification via Google access_token using the userinfo endpoint"""
    test_sub = f"google-access-sub-{uuid.uuid4().hex[:8]}"
    test_email = f"accesstoken-{uuid.uuid4().hex[:6]}@example.com"

    mock_userinfo = {
        "sub": test_sub,
        "email": test_email,
        "email_verified": True,
        "name": "Access Token User",
        "picture": "https://lh3.googleusercontent.com/a/access-avatar"
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_userinfo
        mock_get.return_value = mock_response

        response = client.post("/api/v1/auth/google", json={"access_token": "ya29.valid_access_token"})
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == test_email
        assert data["user"]["google_id"] == test_sub
        assert data["user"]["name"] == "Access Token User"
        assert data["user"]["auth_provider"] == "google"
        assert data["token"].startswith("landos-jwt-")

def test_google_auth_audience_mismatch():
    """Ensure token with mismatched audience is rejected when GOOGLE_CLIENT_ID is configured"""
    from app.core.config import settings

    mock_google_profile = {
        "iss": "https://accounts.google.com",
        "aud": "wrong-client-id.apps.googleusercontent.com",
        "sub": "some-sub-id",
        "email": "mismatch@example.com",
        "email_verified": True
    }

    with patch.object(settings, "GOOGLE_CLIENT_ID", "expected-client-id.apps.googleusercontent.com"):
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_google_profile
            mock_get.return_value = mock_response

            response = client.post("/api/v1/auth/google", json={"id_token": "token_with_wrong_audience"})
            assert response.status_code == 401
            assert "Google authentication token audience mismatch" in response.json()["detail"]

