import re

from app.core.config import settings

COMMON_PASSWORDS: set = {
    "password",
    "password123",
    "12345678",
    "qwerty123",
    "admin123",
    "letmein",
    "welcome",
    "monkey",
    "dragon",
    "master",
    "123456789",
    "1234567890",
    "passw0rd",
    "password1",
    "iloveyou",
    "shadow",
    "sunshine",
    "trustno1",
    "princess",
    "football",
    "baseball",
    "qwertyuiop",
    "qwerty",
    "1234",
    "12345",
    "123456",
    "abcd1234",
}


def validate_password_strength(password: str) -> list[str]:
    errors: list[str] = []

    if len(password) < settings.PASSWORD_MIN_LENGTH:
        errors.append(f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters")

    if password.lower() in COMMON_PASSWORDS:
        errors.append("Password is too common")

    if settings.PASSWORD_REQUIRE_UPPER and not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter")

    if settings.PASSWORD_REQUIRE_LOWER and not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter")

    if settings.PASSWORD_REQUIRE_DIGIT and not re.search(r"\d", password):
        errors.append("Password must contain at least one digit")

    if settings.PASSWORD_REQUIRE_SPECIAL and not re.search(
        r"[!@#$%^&*(),.?\":{}|<>_\-+=~`\[\];'\\/]", password
    ):
        errors.append("Password must contain at least one special character")

    return errors
