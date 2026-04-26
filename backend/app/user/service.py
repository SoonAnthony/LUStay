from typing import List, Optional
from datetime import datetime, timedelta, timezone
import uuid
from fastapi import HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select
from sqlalchemy import desc, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload

from .models import User, UserRole, LandlordRequest, RequestStatus
from .schema import (
    UserSchema,
    UserSelfSchema,
    AdminUserSchema,
    UserCreateSchema,
    UserUpdateSchema,
    AdminUserUpdateSchema,
    RequestEmailChangeSchema,
    RequestPhoneChangeSchema,
    ChangePasswordSchema,
    validate_password_strength,
    LoginSchema,
    LandlordRequestCreate,
    LandlordRequestUpdate,
    LandlordRequestRead,
)
from .exceptions import UserAlreadyExistsError, UserNotFoundError, DatabaseError
from app.core.security import verify_password, hash_password
from .utils import create_access_token, create_refresh_token, decode_access_token, decode_refresh_token
from fastapi import status
from app.core.config import settings
from app.core.mail_services import MailService
from app.core.tokens import create_token, TokenType


class UserService:

    # ── GET ──────────────────────────────────────────────────
    async def get_user(self, session: AsyncSession, user_id: str) -> User:
        try:
            result = await session.exec(select(User).where(User.id == user_id))
            user = result.one_or_none()
            if not user:
                raise UserNotFoundError(f"User {user_id} not found")
            return user
        except UserNotFoundError:
            raise
        except Exception as e:
            raise DatabaseError(f"Failed to fetch user: {str(e)}")

    async def get_all_users(
        self,
        session: AsyncSession,
        limit: int = 50,
        offset: int = 0,
        role: Optional[UserRole] = None,
    ) -> dict:
        try:
            base_query = select(User)
            if role:
                base_query = base_query.where(User.role == role)

            data_query = (
                base_query
                .order_by(desc(User.created_at))
                .offset(offset)
                .limit(limit)
            )
            result = await session.exec(data_query)
            users = result.all()

            count_query = select(func.count()).select_from(base_query.subquery())
            total_result = await session.exec(count_query)
            total = total_result.one()

            return {
                "total": total,
                "limit": limit,
                "offset": offset,
                "users": [AdminUserSchema.model_validate(u) for u in users],
            }
        except Exception as e:
            raise DatabaseError(f"Failed to fetch users: {str(e)}")

    # ── CREATE / UPDATE / DELETE ─────────────────────────────
    async def create_user(
        self,
        session: AsyncSession,
        payload: UserCreateSchema,
        hashed_password: str
    ) -> User:
        try:
            user = User(
                first_name=payload.first_name,
                last_name=payload.last_name,
                email=payload.email,
                phone_number=payload.phone_number,
                password_hash=hashed_password,
                role=UserRole.STUDENT,
            )
            session.add(user)

            token = create_token(
                user_id=str(user.id),
                type=TokenType.EMAIL_VERIFY,
                expires_minutes=30
            )
            link = f"{settings.FRONTEND_URL}/auth/confirm?token={token}"

            mailer = MailService(
                settings.BREVO_API_KEY,
                settings.BREVO_SENDER_EMAIL,
                settings.BREVO_SENDER_NAME
            )
            await mailer.send_email(
                to_email=user.email,
                subject="Verify your LUStay account",
                html_content=f"""
                    <p>Hello {user.first_name},</p>
                    <p>Thanks for registering! Please verify your email:</p>
                    <p><a href="{link}">Verify Email</a></p>
                    <p>This link expires in 30 minutes.</p>
                """
            )

            return user

        except IntegrityError as e:
            err_msg = str(e.orig)
            if "users_email_key" in err_msg or "ix_users_email" in err_msg:
                raise HTTPException(status_code=400, detail="Email already registered")
            elif "users_phone_number_key" in err_msg or "ix_users_phone_number" in err_msg:
                raise HTTPException(status_code=400, detail="Phone number already registered")
            else:
                raise HTTPException(status_code=400, detail="Duplicate value violates unique constraint")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

    async def update_user(self, user: User, payload: UserUpdateSchema) -> User:
        try:
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(user, field, value)
            return user
        except IntegrityError as e:
            err_msg = str(e.orig)
            if "users_email_key" in err_msg or "ix_users_email" in err_msg:
                raise HTTPException(status_code=400, detail="Email already registered")
            elif "users_phone_number_key" in err_msg or "ix_users_phone_number" in err_msg:
                raise HTTPException(status_code=400, detail="Phone number already registered")
            else:
                raise HTTPException(status_code=400, detail="Duplicate value violates unique constraint")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

    async def admin_update_user(self, user: User, payload: AdminUserUpdateSchema) -> User:
        try:
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(user, field, value)
            return user
        except IntegrityError as e:
            err_msg = str(e.orig)
            if "users_email_key" in err_msg or "ix_users_email" in err_msg:
                raise HTTPException(status_code=400, detail="Email already registered")
            elif "users_phone_number_key" in err_msg or "ix_users_phone_number" in err_msg:
                raise HTTPException(status_code=400, detail="Phone number already registered")
            else:
                raise HTTPException(status_code=400, detail="Duplicate value violates unique constraint")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

    async def delete_user(self, user: User) -> User:
        try:
            return user
        except Exception as e:
            raise DatabaseError(f"Failed to delete user: {str(e)}")

    # ── EMAIL / PHONE / PASSWORD ─────────────────────────────
    async def request_email_change(
        self,
        session: AsyncSession,
        user_id: str,
        payload: RequestEmailChangeSchema
    ) -> User:
        user = await session.get(User, user_id)
        if not user:
            raise UserNotFoundError(f"User {user_id} not found")

        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Current password is incorrect")

        user.pending_email = payload.new_email
        session.add(user)

        token = create_token(
            user_id=str(user.id),
            type=TokenType.EMAIL_CHANGE,
            metadata={"new_email": payload.new_email},
            expires_minutes=30
        )
        link = f"{settings.FRONTEND_URL}/auth/confirm?token={token}"

        mailer = MailService(
            settings.BREVO_API_KEY,
            settings.BREVO_SENDER_EMAIL,
            settings.BREVO_SENDER_NAME
        )
        await mailer.send_email(
            to_email=payload.new_email,
            subject="Confirm your new email",
            html_content=f"<p>Click <a href='{link}'>here</a> to confirm your new email.</p>"
        )

        return user

    async def request_phone_change(
        self,
        session: AsyncSession,
        user_id: str,
        payload: RequestPhoneChangeSchema
    ) -> User:
        user = await session.get(User, user_id)
        if not user:
            raise UserNotFoundError(f"User {user_id} not found")

        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Current password is incorrect")

        user.pending_phone = payload.new_phone
        session.add(user)

        token = create_token(
            user_id=str(user.id),
            type=TokenType.PHONE_CHANGE,
            metadata={"new_phone": payload.new_phone},
            expires_minutes=30
        )
        link = f"{settings.FRONTEND_URL}/auth/confirm?token={token}"

        mailer = MailService(
            settings.BREVO_API_KEY,
            settings.BREVO_SENDER_EMAIL,
            settings.BREVO_SENDER_NAME
        )
        await mailer.send_email(
            to_email=user.email,
            subject="Confirm your new phone number",
            html_content=f"<p>Click <a href='{link}'>here</a> to confirm your new phone number.</p>"
        )

        return user

    async def change_password(
        self,
        session: AsyncSession,
        user_id: str,
        payload: ChangePasswordSchema
    ) -> User:
        try:
            user = await session.get(User, user_id)
            if not user:
                raise UserNotFoundError(f"User {user_id} not found")

            if not verify_password(payload.current_password, user.password_hash):
                raise HTTPException(status_code=401, detail="Current password is incorrect")

            validate_password_strength(payload.new_password)

            user.pending_password = hash_password(payload.new_password)
            session.add(user)

            token = create_token(
                user_id=str(user.id),
                type=TokenType.PASSWORD_RESET,
                expires_minutes=30
            )
            link = f"{settings.FRONTEND_URL}/auth/confirm?token={token}"

            mailer = MailService(
                settings.BREVO_API_KEY,
                settings.BREVO_SENDER_EMAIL,
                settings.BREVO_SENDER_NAME
            )
            await mailer.send_email(
                to_email=user.email,
                subject="Confirm your password change",
                html_content=f"<p>Click <a href='{link}'>here</a> to confirm your password change.</p>"
            )

            return user
        except (UserNotFoundError, HTTPException):
            raise
        except Exception as e:
            raise DatabaseError(f"Failed to request password change: {str(e)}")

    # ── LOGIN ────────────────────────────────────────────────
    async def login(self, session: AsyncSession, payload: LoginSchema) -> User:
        result = await session.exec(select(User).where(User.email == payload.email))
        user = result.one_or_none()

        if not user or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        if user.is_suspended:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account suspended"
            )

        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account not verified"
            )

        user.last_login = datetime.now(timezone.utc)
        session.add(user)
        await session.commit()
        await session.refresh(user)

        return user

    # ── HELPERS ──────────────────────────────────────────────
    def _generate_otp(self, length: int = 6) -> str:
        import random
        return ''.join(str(random.randint(0, 9)) for _ in range(length))


# ── LANDLORD REQUEST SERVICE ──────────────────────────────────
class LandlordRequestService:

    async def create_request(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        payload: LandlordRequestCreate
    ):
        result = await session.exec(
            select(LandlordRequest).where(
                LandlordRequest.user_id == user_id,
                LandlordRequest.status == RequestStatus.PENDING
            )
        )
        existing = result.one_or_none()

        if existing:
            raise HTTPException(
                status_code=400,
                detail="You already have a pending landlord request."
            )

        new_request = LandlordRequest(
            user_id=user_id,
            title_deed_url=payload.title_deed_url,
            title_deed_public_id=payload.title_deed_public_id,
            lease_agreement_url=payload.lease_agreement_url,
            lease_agreement_public_id=payload.lease_agreement_public_id,
            authorization_letter_url=payload.authorization_letter_url,
            authorization_letter_public_id=payload.authorization_letter_public_id,
            status=RequestStatus.PENDING,
            submitted_at=datetime.now(timezone.utc)
        )
        session.add(new_request)
        await session.commit()
        await session.refresh(new_request)

        # ✅ Reload with user relationship
        result = await session.execute(
            select(LandlordRequest)
            .options(selectinload(LandlordRequest.user))
            .where(LandlordRequest.id == new_request.id)
        )
        return result.scalar_one()

    async def get_request(self, session: AsyncSession, request_id: uuid.UUID):
        # ✅ Eager-load user
        result = await session.execute(
            select(LandlordRequest)
            .options(selectinload(LandlordRequest.user))
            .where(LandlordRequest.id == request_id)
        )
        request = result.scalar_one_or_none()
        if not request:
            raise HTTPException(status_code=404, detail="Landlord request not found")
        return request

    async def get_all_requests(
        self,
        session: AsyncSession,
        limit: int = 50,
        offset: int = 0
    ):
        # ✅ Eager-load user on all requests
        result = await session.execute(
            select(LandlordRequest)
            .options(selectinload(LandlordRequest.user))
            .offset(offset)
            .limit(limit)
        )
        return result.scalars().all()

    async def update_request(
        self,
        session: AsyncSession,
        request_id: uuid.UUID,
        admin_id: uuid.UUID,
        payload: LandlordRequestUpdate
    ):
        request = await session.get(LandlordRequest, request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Landlord request not found")

        if request.status != RequestStatus.PENDING:
            raise HTTPException(status_code=400, detail="This request has already been reviewed")

        if payload.status == RequestStatus.REJECTED and not payload.rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required when rejecting")

        request.status           = payload.status
        request.rejection_reason = payload.rejection_reason
        request.admin_id         = admin_id
        request.reviewed_at      = datetime.now(timezone.utc)

        if payload.status == RequestStatus.APPROVED:
            user = await session.get(User, request.user_id)
            user.role = UserRole.LANDLORD
            session.add(user)

        session.add(request)
        await session.commit()
        

        # ✅ Reload with user relationship
        result = await session.execute(
            select(LandlordRequest)
            .options(selectinload(LandlordRequest.user))
            .where(LandlordRequest.id == request_id)
        )
        return result.scalar_one()