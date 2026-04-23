from datetime import datetime, timedelta
from jose import JWTError, jwt
from enum import Enum
from typing import Optional
from fastapi import Depends, HTTPException, status, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.db.engine import get_session


# ── TOKEN TYPES ───────────────────────────────────────────────
class TokenType(str, Enum):
    EMAIL_VERIFY   = "email_verify"
    PASSWORD_RESET = "password_reset"
    EMAIL_CHANGE   = "email_change"
    PHONE_CHANGE   = "phone_change"


# ── ACTION TOKEN HELPERS ──────────────────────────────────────
def create_token(
    user_id: str,
    type: TokenType,
    metadata: Optional[dict] = None,
    expires_minutes: int = 30
) -> str:
    """Generate a JWT token for verification actions (email, phone, password)."""
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    payload = {
        "user_id": user_id,
        "type": type,
        "exp": expire
    }
    if metadata:
        payload.update(metadata)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT action token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError(str(e))


# ── AUTH DEPENDENCIES ─────────────────────────────────────────
from app.user.models import User, UserRole
from app.user.utils import decode_access_token


async def get_current_user(
    # ✅ Read access token from HttpOnly cookie — not Authorization header
    access_token: Optional[str] = Cookie(default=None),
    session: AsyncSession = Depends(get_session)
) -> User:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    payload = decode_access_token(access_token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload invalid"
        )

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure the user is active and not suspended."""
    if current_user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account suspended"
        )
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure the user has ADMIN privileges."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


async def get_current_landlord_or_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Ensure the user is either a LANDLORD or ADMIN."""
    if current_user.role not in [UserRole.LANDLORD, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only landlords or admins are allowed to perform this action"
        )
    return current_user