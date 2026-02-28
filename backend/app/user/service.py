from typing import List, Optional
from datetime import datetime, timedelta
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, desc
from sqlalchemy.exc import IntegrityError

from .models import User, UserRole
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
)
from .exceptions import UserAlreadyExistsError, UserNotFoundError, DatabaseError


class UserService:
    # -------------------- User / Admin Fetch -------------------- #
    
    async def get_user(self, session: AsyncSession, user_id: str) -> UserSelfSchema:
        """Fetch a single user for user-level access (self view)."""
        try:
            statement = select(User).where(User.id == user_id)
            result = await session.exec(statement)
            user = result.one_or_none()
            if not user:
                raise UserNotFoundError(f"User {user_id} not found")
            return UserSelfSchema.model_validate(user)
        except Exception as e:
            raise DatabaseError(f"Failed to fetch user: {str(e)}")
    
    async def get_all_users(
        self,
        session: AsyncSession,
        limit: int = 50,
        offset: int = 0,
        role: Optional[UserRole] = None,
    ) -> dict:
        """Fetch all users for admin-level access with optional role filter."""
        try:
            statement = select(User).order_by(desc(User.created_at))
            if role:
                statement = statement.where(User.role == role)
            statement = statement.offset(offset).limit(limit)
            result = await session.exec(statement)
            users = result.all()

            total = await session.exec(select(User).count())
            return {
                "total": total,
                "limit": limit,
                "offset": offset,
                "data": [AdminUserSchema.model_validate(user) for user in users],
            }
        except Exception as e:
            raise DatabaseError(f"Failed to fetch users: {str(e)}")

    # -------------------- Create / Update / Delete -------------------- #
    
    async def create_user(self, payload: UserCreateSchema) -> User:
        """Prepare a new user object (commit in routes)."""
        try:
            user = User(
                first_name=payload.first_name,
                last_name=payload.last_name,
                email=payload.email,
                phone_number=payload.phone_number,
                password_hash=payload.password,  # hash in routes
                role=UserRole.STUDENT,
            )
            return user
        except IntegrityError as e:
            raise UserAlreadyExistsError(f"Email or phone already exists: {str(e)}")
        except Exception as e:
            raise DatabaseError(f"Failed to create user: {str(e)}")
    
    async def update_user(self, user: User, payload: UserUpdateSchema) -> User:
        """Update user-level fields (commit in routes)."""
        try:
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(user, field, value)
            return user
        except Exception as e:
            raise DatabaseError(f"Failed to update user: {str(e)}")
    
    async def admin_update_user(self, user: User, payload: AdminUserUpdateSchema) -> User:
        """Admin can update any user's info including role and suspension."""
        try:
            for field, value in payload.model_dump(exclude_unset=True).items():
                setattr(user, field, value)
            return user
        except Exception as e:
            raise DatabaseError(f"Failed to admin-update user: {str(e)}")
    
    async def delete_user(self, user: User) -> User:
        """Prepare user for deletion (commit in routes)."""
        try:
            return user
        except Exception as e:
            raise DatabaseError(f"Failed to delete user: {str(e)}")
    
    # -------------------- Email / Phone / Password -------------------- #
    
    async def request_email_change(self, user: User, payload: RequestEmailChangeSchema) -> User:
        """Set pending email with OTP (commit in routes)."""
        try:
            user.pending_email = payload.new_email
            user.email_otp = self._generate_otp()
            user.otp_expiry = datetime.utcnow() + timedelta(minutes=15)
            return user
        except Exception as e:
            raise DatabaseError(f"Failed to request email change: {str(e)}")

    async def request_phone_change(self, user: User, payload: RequestPhoneChangeSchema) -> User:
        """Set pending phone with OTP (commit in routes)."""
        try:
            user.pending_phone = payload.new_phone
            user.phone_otp = self._generate_otp()
            user.otp_expiry = datetime.utcnow() + timedelta(minutes=15)
            return user
        except Exception as e:
            raise DatabaseError(f"Failed to request phone change: {str(e)}")

    async def change_password(self, user: User, payload: ChangePasswordSchema) -> User:
        """Update user password (hash in routes)."""
        try:
            user.password_hash = payload.new_password
            return user
        except Exception as e:
            raise DatabaseError(f"Failed to change password: {str(e)}")
    
    # -------------------- Helpers -------------------- #
    
    def _generate_otp(self, length: int = 6) -> str:
        import random
        return ''.join(str(random.randint(0, 9)) for _ in range(length))