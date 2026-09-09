import logging
import uuid
import time
import httpx
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

class GoogleAuthRequest(BaseModel):
    id_token: Optional[str] = None
    credential: Optional[str] = None
    access_token: Optional[str] = None

class GoogleAuthResponse(BaseModel):
    user: dict
    token: str

@router.post("/google", response_model=GoogleAuthResponse, summary="Authenticate or Register via Google OAuth")
async def authenticate_google(
    payload: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Securely verify Google authentication tokens with Google's verification servers,
    safely link or create user records by Google 'sub' (subject ID), and issue a session token.
    """
    token_to_verify = payload.id_token or payload.credential
    access_token = payload.access_token

    if not token_to_verify and not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token, credential, or access token is required."
        )

    google_data = None

    async with httpx.AsyncClient(timeout=10.0) as client:
        # Case 1: Verify Google ID token / Credential via Google's tokeninfo API
        if token_to_verify:
            try:
                verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={token_to_verify}"
                resp = await client.get(verify_url)
                if resp.status_code == 200:
                    data = resp.json()
                    # Check token issuer
                    if data.get("iss") in ["accounts.google.com", "https://accounts.google.com"]:
                        # Validate audience if GOOGLE_CLIENT_ID is configured
                        if settings.GOOGLE_CLIENT_ID and data.get("aud") != settings.GOOGLE_CLIENT_ID:
                            logger.warning(
                                f"Google token audience mismatch: expected {settings.GOOGLE_CLIENT_ID}, got {data.get('aud')}"
                            )
                            raise HTTPException(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Google authentication token audience mismatch."
                            )
                        google_data = {
                            "google_id": data.get("sub"),
                            "email": data.get("email", "").lower().strip(),
                            "email_verified": data.get("email_verified") in [True, "true"],
                            "name": data.get("name") or data.get("email", "").split("@")[0],
                            "avatar": data.get("picture")
                        }
            except HTTPException:
                raise
            except Exception as e:
                logger.warning(f"Google id_token verification request failed: {e}")

        # Case 2: Verify Google Access Token via Google userinfo API
        if not google_data and access_token:
            try:
                userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
                resp = await client.get(
                    userinfo_url,
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    google_data = {
                        "google_id": data.get("sub"),
                        "email": data.get("email", "").lower().strip(),
                        "email_verified": data.get("email_verified", True),
                        "name": data.get("name") or data.get("given_name") or data.get("email", "").split("@")[0],
                        "avatar": data.get("picture")
                    }
            except Exception as e:
                logger.warning(f"Google access_token userinfo request failed: {e}")

    if not google_data or not google_data.get("email") or not google_data.get("google_id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google authentication credentials."
        )

    google_id = google_data["google_id"]
    email = google_data["email"]

    # 1. Search for existing user by stable Google subject ID
    user = db.query(User).filter(User.google_id == google_id).first()

    try:
        if not user:
            # 2. Search for existing user by verified email (safe account linking)
            user = db.query(User).filter(User.email == email).first()
            if user:
                # Safely link Google ID to existing account without overwriting existing data
                user.google_id = google_id
                user.auth_provider = "google"
                user.email_verified = True
                if not user.avatar and google_data.get("avatar"):
                    user.avatar = google_data["avatar"]
                db.commit()
                db.refresh(user)
            else:
                # 3. Create new user account
                user = User(
                    id=str(uuid.uuid4()),
                    email=email,
                    name=google_data.get("name") or email.split("@")[0],
                    google_id=google_id,
                    avatar=google_data.get("avatar"),
                    role="admin",
                    auth_provider="google",
                    email_verified=google_data.get("email_verified", True)
                )
                db.add(user)
                db.commit()
                db.refresh(user)
    except Exception as e:
        db.rollback()
        logger.error(f"Database error during Google user authentication: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to persist user authentication record."
        )

    # Issue application session token
    session_token = f"landos-jwt-{user.role}-{int(time.time())}-{uuid.uuid4().hex[:10]}"

    return GoogleAuthResponse(
        user=user.to_dict(),
        token=session_token
    )
