from typing import Optional
from fastapi import Depends, HTTPException, status, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import uuid

from app.db.engine import get_session
from app.user.models import User, UserRole
from app.user.utils import decode_access_token


async def get_current_user(
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

    try:
        user_uuid = uuid.UUID(user_id)  # ✅ cast string → UUID
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload invalid"
        )

    result = await session.execute(select(User).where(User.id == user_uuid))  # ✅ user_uuid
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
    if current_user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account suspended"
        )
    return current_user


async def get_current_admin(
    current_user: User = Depends(get_current_active_user) 
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


async def get_current_landlord_or_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    if current_user.role not in [UserRole.LANDLORD, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only landlords or admins are allowed to perform this action"
        )
    return current_user

async def require_student(
    current_user: User = Depends(get_current_active_user)
) -> User:
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can make bookings"
        )
    return current_user