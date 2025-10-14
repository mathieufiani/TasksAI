"""
User model for authentication
Supports both email/password and OAuth (Google) authentication
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.models.task import Base


class User(Base):
    """User model for storing user information"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Email (required, unique identifier)
    email = Column(String(255), unique=True, nullable=False, index=True)

    # Password (nullable for OAuth-only users)
    hashed_password = Column(String(255), nullable=True)

    # User profile information
    full_name = Column(String(255), nullable=True)
    profile_picture_url = Column(Text, nullable=True)

    # OAuth information
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    oauth_provider = Column(String(50), nullable=True)  # 'google', etc.

    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

    # Password reset
    reset_token = Column(String(255), nullable=True, unique=True)
    reset_token_expires_at = Column(DateTime, nullable=True)

    # Email verification
    verification_token = Column(String(255), nullable=True, unique=True)
    verification_token_expires_at = Column(DateTime, nullable=True)

    # Relationships
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', full_name='{self.full_name}')>"


class RefreshToken(Base):
    """Refresh token model for JWT token management"""
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    # Token information
    token = Column(String(512), unique=True, nullable=False, index=True)

    # Device/client information (for multi-device support)
    device_info = Column(Text, nullable=True)  # User agent, device name, etc.
    device_id = Column(String(255), nullable=True, index=True)

    # Token status
    is_revoked = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)  # NULL = no expiration (as per requirements)
    last_used = Column(DateTime, nullable=True)
    revoked_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")

    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id={self.user_id}, is_active={self.is_active})>"
