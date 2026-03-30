from datetime import datetime, timedelta
from jose import JWTError, jwt
from enum import Enum
from typing import Optional
from app.core.config import settings

class TokenType(str, Enum):
    EMAIL_VERIFY = "email_verify"
    PASSWORD_RESET = "password_reset"
    EMAIL_CHANGE = "email_change"
    PHONE_CHANGE = "phone_change"

def create_token(
    user_id: str,
    type: TokenType,
    metadata: Optional[dict] = None,
    expires_minutes: int = 30
) -> str:
    """Generate a JWT token for verification actions."""
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
    """Decode and validate a JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError as e:
        raise ValueError(str(e))