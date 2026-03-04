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
from app.user.models import User

user_router = APIRouter(tags=["Users"])
user_service = UserService()

# ============================================================
# SELF ROUTES (Regular User)
# ============================================================

@user_router.get("/me/{user_id}", response_model=UserSchema)
async def get_self(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    user = await user_service.get_user(session, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserSelfSchema.model_validate(user)


@user_router.post("/register", response_model=UserSelfSchema, status_code=201)
async def register(
    payload: UserCreateSchema,
    session: AsyncSession = Depends(get_session),
):
    
    user = await user_service.create_user(session, payload,  hashed_password=hash_password(payload.password))

    await session.commit()
    await session.refresh(user)

    return UserSelfSchema.model_validate(user)


@user_router.patch("/me/{user_id}", response_model=UserSchema)
async def update_self(
    user_id: UUID,
    payload: UserUpdateSchema,
    session: AsyncSession = Depends(get_session),
):
    user = await user_service.update_user(session, user_id, payload)

    await session.commit()
    await session.refresh(user)

    return user


# ============================================================
# EMAIL / PHONE / PASSWORD CHANGE REQUESTS
# ============================================================

@user_router.post("/me/{user_id}/request-email-change")
async def request_email_change(
    user_id: UUID,
    payload: RequestEmailChangeSchema,
    session: AsyncSession = Depends(get_session),
):
    await user_service.request_email_change(session, user_id, payload)
    await session.commit()

    return {"message": "Email change request submitted"}


@user_router.post("/me/{user_id}/request-phone-change")
async def request_phone_change(
    user_id: UUID,
    payload: RequestPhoneChangeSchema,
    session: AsyncSession = Depends(get_session),
):
    await user_service.request_phone_change(session, user_id, payload)
    await session.commit()

    return {"message": "Phone change request submitted"}


@user_router.post("/me/{user_id}/request-password-change")
async def request_password_change(
    user_id: UUID,
    payload: ChangePasswordSchema,
    session: AsyncSession = Depends(get_session),
):
    await user_service.change_password(session, user_id, payload)
    await session.commit()

    return {"message": "Password change request submitted. Check your OTP to confirm."}


# ============================================================
# ADMIN ROUTES
# ============================================================

@user_router.get("/", response_model=PaginatedUsers)
async def get_all_users(
    session: AsyncSession = Depends(get_session),
):
    users = await user_service.get_all_users(session)
    return users


@user_router.get("/{user_id}", response_model=AdminUserSchema)
async def get_user_admin(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    user = await user_service.get_user(session, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return AdminUserSchema.model_validate(user)


@user_router.post("/", response_model=AdminUserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateSchema,
    session: AsyncSession = Depends(get_session),
):
    user = await user_service.create_user(session, payload, hashed_password=hash_password(payload.password)
    )

    await session.commit()
    await session.refresh(user)

    return user


@user_router.patch("/{user_id}", response_model=AdminUserSchema)
async def admin_update_user(
    user_id: UUID,
    payload: AdminUserUpdateSchema,
    session: AsyncSession = Depends(get_session),
):
    user = await user_service.admin_update_user(session, user_id, payload)

    await session.commit()
    await session.refresh(user)

    return user


@user_router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    await user_service.delete_user(session, user_id)
    await session.commit()

    return None