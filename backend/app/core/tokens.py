from datetime import datetime, timedelta
from jose import JWTError, jwt
from enum import Enum
from typing import Optional

from app.core.config import settings


# ── TOKEN TYPES ────────────────────────────
class TokenType(str, Enum):
    EMAIL_VERIFY    = "email_verify"
    PASSWORD_RESET  = "password_reset"
    PASSWORD_CHANGE = "password_change"   
    EMAIL_CHANGE    = "email_change"
    PHONE_CHANGE    = "phone_change"


# ── ACTION TOKEN HELPERS ────────────────────────
def create_token(
    user_id: str,
    type: TokenType,
    metadata: Optional[dict] = None,
    expires_minutes: int = 30
) -> str:
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    payload = {
        "sub": user_id,   
        "type": type,
        "exp": expire
    }
    if metadata:
        payload.update(metadata)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError(str(e))


