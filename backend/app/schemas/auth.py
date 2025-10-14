"""
Pydantic schemas for authentication
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


# User Registration
class UserRegister(BaseModel):
    """Schema for user registration with email/password"""
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None


# User Login
class UserLogin(BaseModel):
    """Schema for user login with email/password"""
    email: EmailStr
    password: str


# Google OAuth
class GoogleAuthRequest(BaseModel):
    """Schema for Google OAuth authentication"""
    id_token: str  # Google ID token from client


# Token Response
class TokenResponse(BaseModel):
    """Schema for authentication token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until access token expires


# Token Refresh
class TokenRefresh(BaseModel):
    """Schema for refreshing access token"""
    refresh_token: str


# User Response
class UserResponse(BaseModel):
    """Schema for user information response"""
    id: int
    email: str
    full_name: Optional[str]
    profile_picture_url: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


# Password Reset Request
class PasswordResetRequest(BaseModel):
    """Schema for requesting password reset"""
    email: EmailStr


# Password Reset Confirm
class PasswordResetConfirm(BaseModel):
    """Schema for confirming password reset"""
    token: str
    new_password: str = Field(..., min_length=6)


# Change Password
class PasswordChange(BaseModel):
    """Schema for changing password (authenticated user)"""
    current_password: str
    new_password: str = Field(..., min_length=6)


# Email Verification
class EmailVerificationRequest(BaseModel):
    """Schema for requesting email verification"""
    email: EmailStr


class EmailVerificationConfirm(BaseModel):
    """Schema for confirming email verification"""
    token: str
