import asyncio
from sqlmodel import select

from app.db.engine import engine
from sqlmodel.ext.asyncio.session import AsyncSession

from app.user.models import User
from app.core.security import hash_password


EMAIL = "esifuna@gmail.com"
NEW_PASSWORD = "User@lustay001"


async def reset_password():
    async with AsyncSession(engine) as session:
        result = await session.execute(
            select(User).where(User.email == EMAIL)
        )
        user = result.scalar_one_or_none()

        if not user:
            print("❌ User not found")
            return

        user.password_hash = hash_password(NEW_PASSWORD)

        session.add(user)
        await session.commit()

        print(f"✅ Password reset successfully for {EMAIL}")


if __name__ == "__main__":
    asyncio.run(reset_password()) 


#To run the script, use the following command in your terminal: python -m app.scripts.reset_password
