from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from uuid import UUID

from app.db.engine import get_session
from app.user.service import UserService
from app.user.schema import (
    UserSchema,
    AdminUserSchema,
    UserCreateSchema,
    UserUpdateSchema,
    AdminUserUpdateSchema,
    RequestEmailChangeSchema,
    RequestPhoneChangeSchema,
    ChangePasswordSchema,
    PaginatedUsers,
    UserSelfSchema,
)
from app.core.security import hash_password
from .models import User
from .dependencies import (
    get_current_user,
    get_current_active_user,
    get_current_admin
)
from .utils import create_access_token, create_refresh_token, decode_access_token

user_router = APIRouter(tags=["Users"])
user_service = UserService()

# ============================================================
# SELF ROUTES (Regular User)
# ============================================================

@user_router.get("/me", response_model=UserSchema)
async def get_self(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the currently logged-in user.
    """
    return UserSelfSchema.model_validate(current_user)


@user_router.post("/register", response_model=UserSelfSchema, status_code=201)
async def register(
    payload: UserCreateSchema,
    session: AsyncSession = Depends(get_session),
):
    
     """
     Register a new user.
     """
     user = await user_service.create_user(
        session,
        payload,
        hashed_password=hash_password(payload.password)
     )
     await session.commit()
     await session.refresh(user)
     return UserSelfSchema.model_validate(user)


@user_router.patch("/me", response_model=UserSchema)
async def update_self(
    payload: UserUpdateSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Update the current user's own data.
    """
    user = await user_service.update_user(current_user, payload)
    await session.commit()
    await session.refresh(user)
    return user


# ============================================================
# EMAIL / PHONE / PASSWORD CHANGE REQUESTS
# ============================================================

@user_router.post("/me/request-email-change")
async def request_email_change(
    payload: RequestEmailChangeSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    await user_service.request_email_change(session, current_user.id, payload)
    await session.commit()
    return {"message": "Email change request submitted"}


@user_router.post("/me/request-phone-change")
async def request_phone_change(
    payload: RequestPhoneChangeSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    await user_service.request_phone_change(session, current_user.id, payload)
    await session.commit()
    return {"message": "Phone change request submitted"}


@user_router.post("/me/request-password-change")
async def request_password_change(
    payload: ChangePasswordSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    await user_service.change_password(session, current_user.id, payload)
    await session.commit()
    return {"message": "Password change request submitted. Check your OTP to confirm."}




# ============================================================
# ADMIN ROUTES
# ============================================================

admin_router = APIRouter(prefix="/admin", tags=["Admin"])

@admin_router.get("/users", response_model=PaginatedUsers)
async def get_all_users(
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    return await user_service.get_all_users(session)


@admin_router.get("/users/{user_id}", response_model=AdminUserSchema)
async def get_user_admin(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    user = await user_service.get_user(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return AdminUserSchema.model_validate(user)


@admin_router.post("/users", response_model=AdminUserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateSchema,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    user = await user_service.create_user(
        session,
        payload,
        hashed_password=hash_password(payload.password)
    )
    await session.commit()
    await session.refresh(user)
    return user


@admin_router.patch("/users/{user_id}", response_model=AdminUserSchema)
async def admin_update_user(
    user_id: UUID,
    payload: AdminUserUpdateSchema,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    user = await user_service.get_user(session, user_id)
    user = await user_service.admin_update_user(user, payload)
    await session.commit()
    await session.refresh(user)
    return user


@admin_router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    user = await user_service.get_user(session, user_id)
    await user_service.delete_user(user)
    await session.delete(user)
    await session.commit()
    return {
        "success": True,
        "message": "User deleted successfully",
        "user_id": user_id
    }