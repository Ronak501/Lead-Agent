import hashlib
import secrets
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



def hash_password(password: str) -> str:
    """Hashes a password with PBKDF2-HMAC-SHA256 and a random salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 310000)
    return f"{salt}:{key.hex()}"


def verify_password(stored_password_hash: Optional[str], provided_password: Optional[str]) -> bool:
    """Verifies a plain password against the stored PBKDF2 salt:hash."""
    if not stored_password_hash or not provided_password:
        return False
    try:
        if ":" not in stored_password_hash:
            return False
        salt, key_hex = stored_password_hash.split(":", 1)
        new_key = hashlib.pbkdf2_hmac("sha256", provided_password.encode("utf-8"), bytes.fromhex(salt), 310000)
        return secrets.compare_digest(new_key.hex(), key_hex)
    except Exception:
        return False

def is_authorized_email(email: str, hosted_domain: str = "") -> bool:
    """Checks if email belongs to @ornitech.in or is an explicitly whitelisted super-admin email."""
    email_clean = (email or "").strip().lower()
    allowed_domain = settings.ALLOWED_OAUTH_DOMAIN.strip().lower()
    whitelisted = [e.strip().lower() for e in settings.ADMIN_WHITELIST_EMAILS.split(",") if e.strip()]
    
    if email_clean in whitelisted:
        return True
    if email_clean.endswith(f"@{allowed_domain}"):
        return True
    return False


def is_admin_email(email: str) -> bool:
    email_clean = (email or "").strip().lower()
    return email_clean in {
        value.strip().lower()
        for value in settings.ADMIN_WHITELIST_EMAILS.split(",")
        if value.strip()
    }


def verify_google_credential(credential_token: str, db: Session) -> dict:
    """
    Verifies Google OAuth ID Token and enforces @ornitech.in domain restriction or admin whitelist.
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

        # Domain & Admin Whitelist Authorization Check
        allowed_domain = settings.ALLOWED_OAUTH_DOMAIN.strip().lower()
        if not is_authorized_email(email, hosted_domain):
            logger.warning(f"Forbidden sign-in attempt from unauthorized email: {email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Only @{allowed_domain} accounts or authorized admin ({settings.ADMIN_WHITELIST_EMAILS}) are permitted.",
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
                    role="admin" if is_admin_email(email) else "member",
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
            "is_admin": is_admin_email(email),
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
                "is_admin": payload["is_admin"],
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


def verify_ornitech_email_login(email: str, name: Optional[str], db: Session, password: Optional[str] = None) -> dict:
    """
    Direct login requiring authorized email (@ornitech.in or admin whitelist) and password verification.
    """
    email_clean = (email or "").strip().lower()
    allowed_domain = settings.ALLOWED_OAUTH_DOMAIN.strip().lower()

    if not is_authorized_email(email_clean):
        logger.warning(f"Rejected sign-in attempt for unauthorized email: {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required to sign in.",
        )

    user = db.query(User).filter_by(email=email_clean).first()
    default_admin_pass = settings.ADMIN_PASSWORD

    valid_password = False
    if user and user.hashed_password:
        if verify_password(user.hashed_password, password):
            valid_password = True
    else:
        # First-time user initialization or unhashed admin login requires master admin password
        if default_admin_pass and password == default_admin_pass:
            valid_password = True

    if not valid_password:
        logger.warning(f"Failed password attempt for {email_clean}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user:
        user = User(
            id=gen_uuid(),
            email=email_clean,
            full_name=name or email_clean.split("@")[0].capitalize(),
            hashed_password=hash_password(password),
            is_active=True,
        )
        db.add(user)
        db.flush()

        ws = db.query(Workspace).filter_by(id=settings.DEFAULT_WORKSPACE_ID).first() or db.query(Workspace).first()
        if ws:
            member = WorkspaceMember(
                workspace_id=ws.id,
                user_id=user.id,
                role="admin" if is_admin_email(email_clean) else "member",
            )
            db.add(member)
        db.commit()
    else:
        if not user.hashed_password:
            user.hashed_password = hash_password(password)
            db.commit()

    payload = {
        "sub": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "domain": allowed_domain,
        "is_admin": is_admin_email(email_clean),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "domain": allowed_domain,
            "is_admin": payload["is_admin"],
        },
    }


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Validates JWT token and ensures requester belongs to @ornitech.in or is whitelisted admin.
    """
    if not credentials:
        return None

    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("email", "")

        if not is_authorized_email(email):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted to authorized users only",
            )

        user = db.query(User).filter_by(id=payload.get("sub")).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account is inactive or unavailable.")
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

