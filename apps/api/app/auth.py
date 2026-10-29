import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, Security, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User, Workspace, WorkspaceMember, gen_uuid

logger = logging.getLogger("leadpilot.auth")
security = HTTPBearer(auto_error=False)

JWT_ALGORITHM = "HS256"


def verify_google_credential(credential_token: str, db: Session) -> dict:
    """
    Verifies Google OAuth ID Token and strictly enforces @ornitech.in domain restriction (Approach 2).
    """
    try:
        # Verify with Google's public keys
        request = google_requests.Request()
        id_info = id_token.verify_oauth2_token(
            credential_token,
            request,
            settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None
        )

        email = (id_info.get("email") or "").strip().lower()
        hosted_domain = (id_info.get("hd") or "").strip().lower()
        full_name = id_info.get("name") or email.split("@")[0]
        picture = id_info.get("picture")

        # Approach 2: Strict domain enforcement for Ornitech
        allowed_domain = settings.ALLOWED_OAUTH_DOMAIN.strip().lower()
        if not (email.endswith(f"@{allowed_domain}") or hosted_domain == allowed_domain):
            logger.warning(f"Forbidden sign-in attempt from non-company email: {email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Only @{allowed_domain} company accounts are authorized to access LeadPilot.",
            )

        # Upsert user record
        user = db.query(User).filter_by(email=email).first()
        if not user:
            user = User(
                id=gen_uuid(),
                email=email,
                full_name=full_name,
                is_active=True,
            )
            db.add(user)
            db.flush()

            # Attach to default workspace
            ws = db.query(Workspace).filter_by(id=settings.DEFAULT_WORKSPACE_ID).first()
            if not ws:
                ws = db.query(Workspace).first()

            if ws:
                member = WorkspaceMember(
                    workspace_id=ws.id,
                    user_id=user.id,
                    role="admin" if "founder" in email or "admin" in email else "member",
                )
                db.add(member)
        else:
            if not user.full_name and full_name:
                user.full_name = full_name

        db.commit()

        # Generate internal JWT session token (valid for 7 days)
        payload = {
            "sub": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "picture": picture,
            "exp": datetime.now(timezone.utc) + timedelta(days=7),
            "domain": allowed_domain,
        }
        token = jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)

        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "picture": picture,
                "domain": allowed_domain,
            },
        }

    except ValueError as e:
        logger.error(f"Invalid Google OAuth credential token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google authentication failed: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during Google verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error",
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Validates JWT token and ensures requester belongs to @ornitech.in.
    """
    if not credentials:
        # If no credentials provided, return None or raise 401
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("email", "")
        allowed_domain = settings.ALLOWED_OAUTH_DOMAIN.strip().lower()

        if not email.endswith(f"@{allowed_domain}"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access restricted to @{allowed_domain} users only",
            )

        user = db.query(User).filter_by(id=payload.get("sub")).first()
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please sign in again.",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication session token.",
        )

