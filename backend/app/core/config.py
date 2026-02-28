from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int = 5432
    DB_NAME: str
    DB_SSL_MODE: str = "require"


    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    

    class Config:
        env_file = Path(__file__).parent.parent.parent / ".env"


settings = Settings()
