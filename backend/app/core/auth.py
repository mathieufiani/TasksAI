"""
Authentication dependencies and utilities for FastAPI endpoints
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.security import decode_token
from app.models.user import User
from app.db.session import get_db

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get the current authenticated user from JWT token

    Args:
        credentials: Bearer token credentials from Authorization header
        db: Database session

    Returns:
        User object

    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    print(f"[DEBUG] Received token: {token[:20]}...")

    payload = decode_token(token)
    print(f"[DEBUG] Decoded payload: {payload}")

    if payload is None:
        print("[DEBUG] Payload is None - token decode failed")
        raise credentials_exception

    # Check token type
    token_type = payload.get("type")
    print(f"[DEBUG] Token type: {token_type}")
    if token_type != "access":
        print(f"[DEBUG] Invalid token type: expected 'access', got '{token_type}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )

    user_id_raw = payload.get("sub")
    print(f"[DEBUG] Raw user_id from payload: {user_id_raw} (type: {type(user_id_raw).__name__})")
    if user_id_raw is None:
        print("[DEBUG] user_id is None")
        raise credentials_exception

    # Convert to int if it's a string
    try:
        user_id: int = int(user_id_raw)
        print(f"[DEBUG] Converted user_id: {user_id} (type: {type(user_id).__name__})")
    except (ValueError, TypeError) as e:
        print(f"[DEBUG] Failed to convert user_id to int: {e}")
        raise credentials_exception

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    print(f"[DEBUG] User found in database: {user is not None}")
    if user is None:
        print(f"[DEBUG] No user found with id: {user_id}")
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get the current authenticated user from JWT token (optional)
    Returns None if no token or invalid token

    Args:
        credentials: Bearer token credentials from Authorization header
        db: Database session

    Returns:
        User object or None
    """
    if credentials is None:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


async def get_current_verified_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get the current authenticated and verified user

    Args:
        current_user: Current authenticated user

    Returns:
        User object

    Raises:
        HTTPException: If user is not verified
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified"
        )

    return current_user
