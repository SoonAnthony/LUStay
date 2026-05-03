from fastapi import APIRouter, Depends, HTTPException, status, Body, Response, Request
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from uuid import UUID
import uuid as uuid_lib
from sqlmodel import select
from app.db.engine import get_session
from app.user.service import UserService, LandlordRequestService
from app.user.schema import (
    RefreshTokenResponse,
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
    LoginSchema,
    LandlordRequestCreate,
    LandlordRequestRead,
    LandlordRequestUpdate,
    ForgotPasswordSchema,
    ResetPasswordSchema,
)
from app.core.security import hash_password
from .models import User, LandlordRequest

from .dependencies import get_current_active_user, get_current_admin
from app.user.utils import create_access_token, create_refresh_token, decode_refresh_token
from app.core.tokens import decode_token, TokenType
from app.core.mail_services import MailService
from sqlalchemy.exc import IntegrityError
from app.core.config import settings
from sqlalchemy.orm import selectinload

# ── COOKIE SETTINGS ───────────────────────────────────────────
COOKIE_MAX_AGE_ACCESS  = 15 * 60            # 15 minutes
COOKIE_MAX_AGE_REFRESH = 7 * 24 * 60 * 60  # 7 days
COOKIE_SECURE          = settings.COOKIE_SECURE
COOKIE_SAMESITE        = settings.COOKIE_SAMESITE


user_router  = APIRouter(tags=["Users"])
user_service = UserService()


# ── SELF ROUTES ───────────────────────────────────────────────

@user_router.get("/me", response_model=UserSelfSchema)
async def get_self(
    current_user: User = Depends(get_current_active_user)
):
    return UserSelfSchema.model_validate(current_user)


@user_router.post("/register", response_model=UserSelfSchema, status_code=201)
async def register(
    payload: UserCreateSchema,
    session: AsyncSession = Depends(get_session),
):
    try:
        user = await user_service.create_user(
            session,
            payload,
            hashed_password=hash_password(payload.password)
        )
        await session.commit()
        await session.refresh(user)

    except IntegrityError as e:
        await session.rollback()
        err_msg = str(e.orig)
        if "users_email_key" in err_msg or "ix_users_email" in err_msg:
            raise HTTPException(status_code=400, detail="Email already registered")
        elif "users_phone_number_key" in err_msg or "ix_users_phone_number" in err_msg:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        else:
            raise HTTPException(status_code=400, detail="Duplicate value violates unique constraint")
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to register user: {str(e)}")

    return UserSelfSchema.model_validate(user)


@user_router.patch("/me", response_model=UserSelfSchema)
async def update_self(
    payload: UserUpdateSchema,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    try:
        user = await user_service.update_user(current_user, payload)
        await session.commit()
        await session.refresh(user)
        return user
    except IntegrityError as e:
        await session.rollback()    
        err_msg = str(e.orig)
        if "users_email_key" in err_msg or "ix_users_email" in err_msg:
            raise HTTPException(status_code=400, detail="Email already registered")
        elif "users_phone_number_key" in err_msg or "ix_users_phone_number" in err_msg:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        else:
            raise HTTPException(status_code=400, detail="Duplicate value violates unique constraint")


# ── EMAIL / PHONE / PASSWORD CHANGE ───────────────────────────

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
    return {"message": "Password change request submitted. Check your email to confirm."}


# ── LOGIN ─────────────────────────────────────────────────────

@user_router.post("/login", response_model=UserSelfSchema)
async def login(
    payload: LoginSchema,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    user = await user_service.login(session, payload)

    access_token  = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE_ACCESS,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE_REFRESH,
        path="/",
    )

    return UserSelfSchema.model_validate(user)


# ── REFRESH ───────────────────────────────────────────────────

@user_router.post("/refresh", response_model=UserSelfSchema)
async def refresh_token(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session)
):
    token = request.cookies.get("refresh_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided"
        )

    payload = decode_refresh_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    user = await user_service.get_user(session, user_id)

    if user.is_suspended:
        raise HTTPException(status_code=403, detail="User account is suspended")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="User account not verified")

    new_access_token  = create_access_token(data={"sub": user_id})
    new_refresh_token = create_refresh_token(data={"sub": user_id})

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE_ACCESS,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=COOKIE_MAX_AGE_REFRESH,
        path="/",
    )

    return UserSelfSchema.model_validate(user)


# ── LOGOUT ────────────────────────────────────────────────────

@user_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )
    response.delete_cookie(
        key="refresh_token",
        path="/",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
    )
    return {"message": "Logged out successfully"}


# ── CONFIRM ACTION ────────────────────────────────────────────

@user_router.get("/confirm")
async def confirm_action(
    token: str,
    session: AsyncSession = Depends(get_session)
):
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user_id     = payload["sub"]        
    action_type = payload["type"]

    try:
        user_uuid = uuid_lib.UUID(user_id)
    except (KeyError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid token payload")

    user = await session.get(User, user_uuid)  
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if action_type == TokenType.EMAIL_VERIFY.value:
        if user.is_verified:
            raise HTTPException(status_code=400, detail="Email already verified")
        user.is_verified = True

    elif action_type == TokenType.PASSWORD_RESET.value:
        user.password_hash    = hash_password(payload.get("new_password", ""))
        user.pending_password = None

    elif action_type == TokenType.PASSWORD_CHANGE.value:  
        if not user.pending_password:
            raise HTTPException(status_code=400, detail="No pending password change")
        user.password_hash    = user.pending_password
        user.pending_password = None

    elif action_type == TokenType.EMAIL_CHANGE.value:
        if not user.pending_email and not payload.get("new_email"):
            raise HTTPException(status_code=400, detail="No pending email change")
        user.email         = user.pending_email or payload.get("new_email")
        user.pending_email = None
        user.is_verified   = True

    elif action_type == TokenType.PHONE_CHANGE.value:
        if not user.pending_phone and not payload.get("new_phone"):
            raise HTTPException(status_code=400, detail="No pending phone change")
        user.phone_number  = user.pending_phone or payload.get("new_phone")
        user.pending_phone = None

    else:
        raise HTTPException(status_code=400, detail="Unknown action type")

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return {"message": f"{action_type} confirmed successfully", "type": action_type}


# ── FORGOT / RESET PASSWORD (unauthenticated) ─────────────────

@user_router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordSchema,
    session: AsyncSession = Depends(get_session)
):
    await user_service.forgot_password(session, payload.email)
    return {"message": "If that email exists, a reset link has been sent."}


@user_router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordSchema,
    session: AsyncSession = Depends(get_session)
):
    try:
        token_data = decode_token(payload.token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if token_data.get("type") != TokenType.PASSWORD_RESET.value:
        raise HTTPException(status_code=400, detail="Invalid token type")

    try:
        user_uuid = uuid_lib.UUID(token_data["sub"])   
    except (KeyError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid token payload")

    user = await session.get(User, user_uuid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash    = hash_password(payload.new_password)
    user.pending_password = None
    session.add(user)
    await session.commit()

    return {"message": "Password reset successfully. You can now log in."}

# ── ADMIN ROUTES ──────────────────────────────────────────────

admin_router = APIRouter(prefix="/admin", tags=["Admin Users"])


@admin_router.get("/users", response_model=PaginatedUsers)
async def get_all_users(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    return await user_service.get_all_users(session)


@admin_router.get("/users/{user_id}", response_model=AdminUserSchema)
async def get_user_admin(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    user = await user_service.get_user(session, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return AdminUserSchema.model_validate(user)


@admin_router.post("/users", response_model=AdminUserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreateSchema,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    try:
        user = await user_service.create_user(
            session,
            payload,
            hashed_password=hash_password(payload.password)
        )
        await session.commit()
        await session.refresh(user)
        return user
    except IntegrityError as e:
        err_msg = str(e.orig)
        if "users_email_key" in err_msg or "ix_users_email" in err_msg:
            raise HTTPException(status_code=400, detail="Email already registered")
        elif "users_phone_number_key" in err_msg or "ix_users_phone_number" in err_msg:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        else:
            raise HTTPException(status_code=400, detail="Duplicate value violates unique constraint")


@admin_router.patch("/users/{user_id}", response_model=AdminUserSchema)
async def admin_update_user(
    user_id: UUID,
    payload: AdminUserUpdateSchema,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    try:
        user = await user_service.get_user(session, user_id)
        user = await user_service.admin_update_user(user, payload)
        await session.commit()
        await session.refresh(user)
        return user
    except IntegrityError as e:
        err_msg = str(e.orig)
        if "users_email_key" in err_msg or "ix_users_email" in err_msg:
            raise HTTPException(status_code=400, detail="Email already registered")
        elif "users_phone_number_key" in err_msg or "ix_users_phone_number" in err_msg:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        else:
            raise HTTPException(status_code=400, detail="Duplicate value violates unique constraint")


@admin_router.delete("/users/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: UUID,
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    user = await user_service.get_user(session, user_id)
    await user_service.delete_user(user)
    await session.delete(user)
    await session.commit()
    return {"success": True, "message": "User deleted successfully", "user_id": user_id}


# ── LANDLORD REQUEST ROUTES ───────────────────────────────────

landlord_router  = APIRouter(prefix="/me/landlord-requests", tags=["Landlord Requests"])
landlord_service = LandlordRequestService()


@landlord_router.post("/", response_model=LandlordRequestRead, status_code=status.HTTP_201_CREATED)
async def create_landlord_request(
    payload: LandlordRequestCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    request = await landlord_service.create_request(session, current_user.id, payload)
    return LandlordRequestRead.model_validate(request)


@landlord_router.get("/", response_model=List[LandlordRequestRead])
async def get_my_requests(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    result = await session.execute(
        select(LandlordRequest)
        .options(selectinload(LandlordRequest.user))
        .where(LandlordRequest.user_id == current_user.id)
    )
    requests = result.scalars().all()
    return [LandlordRequestRead.model_validate(r) for r in requests]


@landlord_router.get("/{request_id}", response_model=LandlordRequestRead)
async def get_my_request(
    request_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    request = await landlord_service.get_request(session, request_id)
    if request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this request")
    return LandlordRequestRead.model_validate(request)


# ── ADMIN LANDLORD REQUEST ROUTES ─────────────────────────────

admin_landlord_router = APIRouter(
    prefix="/admin/landlord-requests",
    tags=["Admin Landlord Requests"]
)


@admin_landlord_router.get("/", response_model=List[LandlordRequestRead])
async def get_all_requests(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    requests = await landlord_service.get_all_requests(session)
    return [LandlordRequestRead.model_validate(r) for r in requests]


@admin_landlord_router.patch("/{request_id}", response_model=LandlordRequestRead)
async def review_request(
    request_id: UUID,
    payload: LandlordRequestUpdate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    request = await landlord_service.update_request(session, request_id, admin.id, payload)
    return LandlordRequestRead.model_validate(request)