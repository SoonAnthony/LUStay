from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import Optional
from app.core.config import settings
from brevo import Brevo
from brevo.transactional_emails import (
    SendTransacEmailRequestSender,
    SendTransacEmailRequestToItem,
)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None)->str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None)->str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS) 
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "access":
            raise JWTError("Invalid token type")
        return payload
    except JWTError:
        return None
    
def decode_refresh_token(token: str) -> Optional[dict]:
    from jose import JWTError
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise JWTError("Invalid token type")
        return payload
    except JWTError:
        return None
    
class MailService:
    def __init__(self, api_key: str, sender_email: str, sender_name: str = "LUStay"):
        self.client = Brevo(api_key=api_key)
        self.sender = SendTransacEmailRequestSender(
            name=sender_name,
            email=sender_email,
        )

    async def send_email(self, to_email: str, subject: str, html_content: str, to_name: str = "") -> bool:
        try:
            result = self.client.transactional_emails.send_transac_email(
                subject=subject,
                html_content=html_content,
                sender=self.sender,
                to=[SendTransacEmailRequestToItem(email=to_email, name=to_name)],
            )
            print("Email sent. Message ID:", result.message_id)
            return True
        except Exception as e:
            print(f"Error sending email: {e}")
            return False
