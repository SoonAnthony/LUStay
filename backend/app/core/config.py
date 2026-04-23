from dotenv import load_dotenv
load_dotenv()

from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    #Database configuration
    DB_USER: str
    DB_PASSWORD: str
    DB_HOST: str
    DB_PORT: int 
    DB_NAME: str
    DB_SSL_MODE: str = "require"
    #Security configuration
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    #Cloudinary configuration
    CLOUDINARY_URL: str
    #Brevo configuration
    BREVO_API_KEY: str
    BREVO_SENDER_EMAIL: str
    BREVO_SENDER_NAME: str = "LUStay"
    #MPESA configuration
    MPESA_CONSUMER_KEY: str
    MPESA_CONSUMER_SECRET: str
    MPESA_SHORTCODE: str
    MPESA_PASSKEY: str
    MPESA_CALLBACK_URL: str
    MPESA_ENV: str = "sandbox"
    #Frontend configuration
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = Path(__file__).parent.parent.parent / ".env"


settings = Settings()