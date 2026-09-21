import os
from dotenv import load_dotenv

load_dotenv()  # Reads .env file automatically

class Config:
    SECRET_KEY     = os.getenv("SECRET_KEY", "fallback-secret")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback-jwt")
    MONGO_URI      = os.getenv("MONGO_URI")
    DEBUG          = os.getenv("FLASK_ENV") == "development"