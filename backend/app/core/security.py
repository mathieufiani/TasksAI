"""
Security utilities for password hashing and JWT token generation
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import bcrypt
from jose import JWTError, jwt
from app.core.config import settings
import secrets


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database

    Returns:
        True if password matches, False otherwise
    """
    # Truncate to 72 bytes for bcrypt compatibility
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt

    Args:
        password: Plain text password

    Returns:
        Hashed password
    """
    # Truncate to 72 bytes for bcrypt compatibility
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password meets security requirements:
    - Minimum 6 characters
    - Contains at least one special character

    Args:
        password: Plain text password

    Returns:
        (is_valid, error_message)
    """
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"

    special_characters = "!@#$%^&*(),.?\":{}|<>"
    if not any(char in special_characters for char in password):
        return False, "Password must contain at least one special character"

    return True, None


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token

    Args:
        data: Data to encode in the token (typically {"sub": user_id})
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def create_refresh_token(data: Dict[str, Any]) -> str:
    """
    Create a JWT refresh token (no expiration as per requirements)

    Args:
        data: Data to encode in the token (typically {"sub": user_id})

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()

    # Add unique identifier (jti) to make each token unique
    # This prevents duplicate token issues when same user logs in multiple times
    to_encode.update({
        "type": "refresh",
        "jti": secrets.token_urlsafe(16),  # JWT ID for uniqueness
        "iat": datetime.utcnow()  # Issued at timestamp
    })

    # No expiration for refresh tokens
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and verify a JWT token

    Args:
        token: JWT token to decode

    Returns:
        Decoded token payload or None if invalid
    """
    try:
        print(f"[DEBUG decode_token] Attempting to decode token")
        print(f"[DEBUG decode_token] JWT_SECRET_KEY: {settings.JWT_SECRET_KEY[:10]}...")
        print(f"[DEBUG decode_token] JWT_ALGORITHM: {settings.JWT_ALGORITHM}")

        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        print(f"[DEBUG decode_token] Successfully decoded payload: {payload}")
        return payload
    except JWTError as e:
        print(f"[DEBUG decode_token] JWTError occurred: {type(e).__name__}: {str(e)}")
        return None


def generate_reset_token() -> str:
    """
    Generate a secure random token for password reset

    Returns:
        Random URL-safe token
    """
    return secrets.token_urlsafe(32)


def generate_verification_token() -> str:
    """
    Generate a secure random token for email verification

    Returns:
        Random URL-safe token
    """
    return secrets.token_urlsafe(32)
