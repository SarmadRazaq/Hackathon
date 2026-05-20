"""
Firebase ID token verification for FastAPI.

In production: set GOOGLE_APPLICATION_CREDENTIALS or run on GCP with ADC.
In development: set AUTH_DISABLED=true to bypass token checks (all requests
pass through with a synthetic {"uid": "dev", "dev_mode": True} claim dict).
"""

import os
import logging
from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger(__name__)
bearer_scheme = HTTPBearer(auto_error=False)

_AUTH_DISABLED = os.getenv("AUTH_DISABLED", "false").lower() == "true"

if _AUTH_DISABLED:
    logger.warning(
        "AUTH_DISABLED=true — all endpoints are unauthenticated. "
        "Never use this in production."
    )


@lru_cache(maxsize=1)
def _get_firebase_app():
    """Initialise Firebase Admin SDK once and cache it."""
    import firebase_admin
    from firebase_admin import credentials

    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    project_id = os.getenv("FIREBASE_PROJECT_ID", "portfolio-website-cd2c6")
    options = {"projectId": project_id} if project_id else {}

    if cred_path:
        cred = credentials.Certificate(cred_path)
    else:
        # Falls back to Application Default Credentials (Cloud Run / GCE)
        cred = credentials.ApplicationDefault()

    return firebase_admin.initialize_app(cred, options)


_DEV_USER = {"uid": "dev", "dev_mode": True}


async def require_auth(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """FastAPI dependency — verifies Firebase ID token and returns decoded claims.

    Set AUTH_DISABLED=true in .env to skip verification during local development.
    """
    if _AUTH_DISABLED:
        return _DEV_USER

    if creds is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        _get_firebase_app()
        from firebase_admin import auth as firebase_auth

        decoded = firebase_auth.verify_id_token(creds.credentials)
        return decoded
    except Exception as exc:
        logger.warning("Token verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def optional_auth(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict | None:
    """Like require_auth but returns None for unauthenticated requests instead of raising."""
    if _AUTH_DISABLED:
        return _DEV_USER

    if creds is None:
        return None
    try:
        _get_firebase_app()
        from firebase_admin import auth as firebase_auth

        return firebase_auth.verify_id_token(creds.credentials)
    except Exception as exc:
        logger.warning("Optional auth token invalid: %s", exc)
        return None
