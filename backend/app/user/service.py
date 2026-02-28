from sqlmodel.ext.asyncio.session import AsyncSession
from .schema import UserSchema, UserSelfSchema, AdminUserSchema, UserCreateSchema, UserUpdateSchema, AdminUserUpdateSchema, RequestEmailChangeSchema, RequestPhoneChangeSchema, ChangePasswordSchema
from .models import User, UserRole
from sqlmodel import select, desc


class UserService:
    async def get_all_users(self, session: AsyncSession):
        statement = select(User).order_by(desc(User.created_at))
        result = await session.exec(statement)
        return result.all()