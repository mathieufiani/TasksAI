"""
Authentication API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
import base64
import os
from pathlib import Path

from app.db.session import get_db
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    GoogleAuthRequest,
    TokenResponse,
    TokenRefresh,
    UserResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
    PasswordChange,
)
from app.services.auth_service import AuthService
from app.core.auth import get_current_user
from app.core.security import verify_password, get_password_hash, validate_password_strength
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new user with email and password

    Returns access and refresh tokens
    """
    auth_service = AuthService(db)
    user, tokens = auth_service.register_user(user_data)
    return tokens


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    """
    Login with email and password

    Returns access and refresh tokens
    """
    auth_service = AuthService(db)
    user, tokens = auth_service.login_user(login_data)
    return tokens


@router.post("/google", response_model=TokenResponse)
async def google_auth(
    auth_data: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate with Google OAuth

    Client should send the Google ID token from the mobile app

    Returns access and refresh tokens
    """
    auth_service = AuthService(db)
    user, tokens = await auth_service.google_auth(auth_data)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    token_data: TokenRefresh,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token

    Returns new access token (keeps same refresh token)
    """
    auth_service = AuthService(db)
    tokens = auth_service.refresh_access_token(token_data.refresh_token)
    return tokens


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information

    Requires valid access token
    """
    return current_user


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout user (revokes all refresh tokens)

    Requires valid access token
    """
    auth_service = AuthService(db)
    auth_service.revoke_refresh_token(current_user.id)

    return {"message": "Successfully logged out"}


@router.post("/password/reset-request")
async def request_password_reset(
    request_data: PasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Request password reset email

    Sends email with reset token (if email exists)
    Always returns success for security
    """
    auth_service = AuthService(db)
    auth_service.request_password_reset(request_data)

    return {
        "message": "If the email exists, a password reset link has been sent"
    }


@router.post("/password/reset-confirm")
async def confirm_password_reset(
    confirm_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Confirm password reset with token

    Resets password if token is valid
    """
    auth_service = AuthService(db)
    auth_service.confirm_password_reset(confirm_data)

    return {"message": "Password successfully reset"}


@router.post("/password/change")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change password for authenticated user

    Requires current password verification
    """
    # Verify current password
    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User has no password set (OAuth user)"
        )

    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    # Validate new password strength
    is_valid, error_msg = validate_password_strength(password_data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    db.commit()

    return {"message": "Password successfully changed"}


@router.post("/profile/picture")
async def upload_profile_picture(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload or update profile picture

    Accepts image file and stores it as base64 data URL in database
    Supports: JPEG, PNG, GIF (max 5MB)
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
        )

    # Read file content
    content = await file.read()

    # Validate file size (max 5MB)
    max_size = 5 * 1024 * 1024  # 5MB in bytes
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit"
        )

    # Convert to base64 data URL
    base64_data = base64.b64encode(content).decode('utf-8')
    data_url = f"data:{file.content_type};base64,{base64_data}"

    # Update user profile picture
    current_user.profile_picture_url = data_url
    db.commit()

    return {
        "message": "Profile picture uploaded successfully",
        "profile_picture_url": data_url
    }
