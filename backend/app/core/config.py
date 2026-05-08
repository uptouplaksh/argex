from pathlib import Path
from dotenv import load_dotenv
import os

# Load .env properly
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"

load_dotenv(dotenv_path=env_path)

# Database
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set")

# JWT Config (THIS WAS MISSING)
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
LOGIN_OTP_ENABLED = os.getenv("LOGIN_OTP_ENABLED", "true").lower() == "true"
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "5"))
STARTER_ACCOUNT_BALANCE = float(os.getenv("STARTER_ACCOUNT_BALANCE", "10000"))
CURRENCY_RATE_TTL_SECONDS = int(os.getenv("CURRENCY_RATE_TTL_SECONDS", "1800"))
CURRENCY_RATE_API_URL = os.getenv("CURRENCY_RATE_API_URL", "https://api.frankfurter.app/latest")
OTP_RESEND_COOLDOWN_SECONDS = int(os.getenv("OTP_RESEND_COOLDOWN_SECONDS", "60"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL") or os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
SMTP_DEV_LOG_OTP = os.getenv("SMTP_DEV_LOG_OTP", "false").lower() == "true"
