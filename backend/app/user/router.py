from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlmodel.ext.asyncio.session import AsyncSession
from typing import List
from uuid import UUID
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
    TokenResponse,
    LandlordRequestCreate,
    LandlordRequestRead,
    LandlordRequestUpdate
)
from app.core.security import hash_password
from .models import User
from .dependencies import (
    get_current_active_user,
    get_current_admin
)
from app.user.utils import create_access_token, create_refresh_token, decode_refresh_token
from app.core.tokens import decode_token, TokenType
from sqlalchemy.exc import IntegrityError


user_router = APIRouter(tags=["Users"])
user_service = UserService()

# SELF ROUTES (Regular User)
@user_router.get("/me", response_model=UserSchema)
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
        return UserSelfSchema.model_validate(user)

    except IntegrityError as e:
        err_msg = str(e.orig)
        if "users_email_key" in err_msg or "ix_users_email" in err_msg:
            raise HTTPException(status_code=400, detail="Email already registered")
        elif "users_phone_number_key" in err_msg or "ix_users_phone_number" in err_msg:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        else:
            raise HTTPException(status_code=400, detail="Duplicate value violates unique constraint")



@user_router.patch("/me", response_model=UserSchema)
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
        err_msg = str(e.orig)
        if "users_email_key" in err_msg or "ix_users_email" in err_msg:
            raise HTTPException(status_code=400, detail="Email already registered")
        elif "users_phone_number_key" in err_msg or "ix_users_phone_number" in err_msg:
            raise HTTPException(status_code=400, detail="Phone number already registered")
        else:
            raise HTTPException(status_code=400, detail="Duplicate value violates unique constraint")


# EMAIL / PHONE / PASSWORD CHANGE REQUESTS
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



# POST /auth/login
@user_router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginSchema,
    session: AsyncSession = Depends(get_session)
):
    """
    Authenticate a user and return access & refresh JWT tokens.
    """
    tokens = await user_service.login(session, payload)
    return tokens

# POST /auth/refresh
@user_router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    refresh_token: str = Body(..., embed=True),
    session: AsyncSession = Depends(get_session)
):
    # Decode the refresh token
    payload = decode_refresh_token(refresh_token)
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

    # Check that the user exists and is active
    user = await user_service.get_user(session, user_id)
    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is suspended"
        )
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account not verified"
        )

    # Generate new tokens
    access_token = create_access_token(data={"sub": user_id})
    new_refresh_token = create_refresh_token(data={"sub": user_id})

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


# ADMIN ROUTES
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
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        elif "users_phone_number_key" in err_msg or "ix_users_phone_number" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate value violates unique constraint"
            )



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
    return {
        "success": True,
        "message": "User deleted successfully",
        "user_id": user_id
    }


landlord_router = APIRouter(prefix="/me/landlord-requests", tags=["Landlord Requests"])
landlord_service = LandlordRequestService()

# USER ROUTES
@landlord_router.post("/", response_model=LandlordRequestRead, status_code=status.HTTP_201_CREATED)
async def create_landlord_request(
    payload: LandlordRequestCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Create a new landlord request (for a user).
    """
    request = await landlord_service.create_request(session, current_user.id, payload)
    return LandlordRequestRead.model_validate(request)


@landlord_router.get("/", response_model=List[LandlordRequestRead])
async def get_my_requests(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all landlord requests submitted by the current user.
    """
    all_requests = await landlord_service.get_all_requests(session)
    user_requests = [r for r in all_requests if r.user_id == current_user.id]
    return [LandlordRequestRead.model_validate(r) for r in user_requests]


@landlord_router.get("/{request_id}", response_model=LandlordRequestRead)
async def get_my_request(
    request_id: UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific landlord request by ID (must belong to the user).
    """
    request = await landlord_service.get_request(session, request_id)
    if request.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this request")
    return LandlordRequestRead.model_validate(request)


# ADMIN ROUTES
admin_landlord_router = APIRouter(prefix="/admin/landlord-requests", tags=["Admin Landlord Requests"])

@admin_landlord_router.get("/", response_model=List[LandlordRequestRead])
async def get_all_requests(
    session: AsyncSession = Depends(get_session),
    _: User = Depends(get_current_admin)
):
    """
    Admin: Get all landlord requests.
    """
    requests = await landlord_service.get_all_requests(session)
    return [LandlordRequestRead.model_validate(r) for r in requests]


@admin_landlord_router.patch("/{request_id}", response_model=LandlordRequestRead)
async def review_request(
    request_id: UUID,
    payload: LandlordRequestUpdate,
    session: AsyncSession = Depends(get_session),
    admin: User = Depends(get_current_admin)
):
    """
    Admin: Approve or reject a landlord request.
    """
    request = await landlord_service.update_request(session, request_id, admin.id, payload)
    return LandlordRequestRead.model_validate(request)


#confirmation links routes
@user_router.get("/auth/confirm")
async def confirm_action(token: str, session: AsyncSession = Depends(get_session)):
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user_id = payload["user_id"]
    action_type = payload["type"]

    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if action_type == TokenType.EMAIL_VERIFY:
        user.is_verified = True
    elif action_type == TokenType.PASSWORD_RESET:
        user.password_hash = user.pending_password
        user.pending_password = None
    elif action_type == TokenType.EMAIL_CHANGE:
        user.email = user.pending_email or payload.get("new_email")
        user.pending_email = None
        user.is_verified = True
    elif action_type == TokenType.PHONE_CHANGE:
        user.phone_number = user.pending_phone or payload.get("new_phone")
        user.pending_phone = None
    else:
        raise HTTPException(status_code=400, detail="Unknown action type")

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return {"message": f"{action_type} confirmed successfully"}