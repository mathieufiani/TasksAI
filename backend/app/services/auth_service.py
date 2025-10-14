"""
Authentication service for user management
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.models.user import User, RefreshToken
from app.schemas.auth import (
    UserRegister,
    UserLogin,
    GoogleAuthRequest,
    TokenResponse,
    PasswordResetRequest,
    PasswordResetConfirm,
)
from app.core.security import (
    verify_password,
    get_password_hash,
    validate_password_strength,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_reset_token,
    generate_verification_token,
)
from app.core.config import settings
from fastapi import HTTPException, status


class AuthService:
    """Service for authentication operations"""

    def __init__(self, db: Session):
        self.db = db

    def register_user(self, user_data: UserRegister) -> Tuple[User, TokenResponse]:
        """
        Register a new user with email/password

        Args:
            user_data: User registration data

        Returns:
            (User, TokenResponse)

        Raises:
            HTTPException: If email already exists or password invalid
        """
        # Check if user exists
        existing_user = self.db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Validate password strength
        is_valid, error_msg = validate_password_strength(user_data.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

        # Hash password
        hashed_password = get_password_hash(user_data.password)

        # Create user
        user = User(
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            is_verified=False,  # Email verification required
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # Generate tokens
        tokens = self._create_user_tokens(user)

        return user, tokens

    def login_user(self, login_data: UserLogin) -> Tuple[User, TokenResponse]:
        """
        Login user with email/password

        Args:
            login_data: User login credentials

        Returns:
            (User, TokenResponse)

        Raises:
            HTTPException: If credentials invalid
        """
        # Get user
        user = self.db.query(User).filter(User.email == login_data.email).first()
        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Verify password
        if not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated"
            )

        # Update last login
        user.last_login = datetime.utcnow()
        self.db.commit()

        # Generate tokens
        tokens = self._create_user_tokens(user)

        return user, tokens

    async def google_auth(self, auth_data: GoogleAuthRequest) -> Tuple[User, TokenResponse]:
        """
        Authenticate user with Google OAuth

        Args:
            auth_data: Google auth data with ID token

        Returns:
            (User, TokenResponse)

        Raises:
            HTTPException: If token invalid
        """
        try:
            # Verify Google ID token
            idinfo = id_token.verify_oauth2_token(
                auth_data.id_token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            # Get user info from token
            google_id = idinfo['sub']
            email = idinfo['email']
            full_name = idinfo.get('name')
            profile_picture = idinfo.get('picture')

            # Check if user exists by Google ID or email
            user = self.db.query(User).filter(
                (User.google_id == google_id) | (User.email == email)
            ).first()

            if user:
                # Update existing user
                if not user.google_id:
                    user.google_id = google_id
                    user.oauth_provider = "google"
                if not user.full_name and full_name:
                    user.full_name = full_name
                if not user.profile_picture_url and profile_picture:
                    user.profile_picture_url = profile_picture
                user.is_verified = True  # Email verified by Google
                user.last_login = datetime.utcnow()
            else:
                # Create new user
                user = User(
                    email=email,
                    google_id=google_id,
                    oauth_provider="google",
                    full_name=full_name,
                    profile_picture_url=profile_picture,
                    is_verified=True,  # Email verified by Google
                    last_login=datetime.utcnow()
                )
                self.db.add(user)

            self.db.commit()
            self.db.refresh(user)

            # Generate tokens
            tokens = self._create_user_tokens(user)

            return user, tokens

        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Google token: {str(e)}"
            )

    def refresh_access_token(self, refresh_token_str: str) -> TokenResponse:
        """
        Refresh access token using refresh token

        Args:
            refresh_token_str: Refresh token string

        Returns:
            New TokenResponse

        Raises:
            HTTPException: If refresh token invalid
        """
        # Decode refresh token
        payload = decode_token(refresh_token_str)
        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        # Check if refresh token exists in database
        db_token = self.db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token_str,
            RefreshToken.is_active == True,
            RefreshToken.is_revoked == False
        ).first()

        if not db_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token not found or revoked"
            )

        # Get user
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or deactivated"
            )

        # Update token last used
        db_token.last_used = datetime.utcnow()
        self.db.commit()

        # Create new access token (sub must be a string for JWT)
        access_token = create_access_token({"sub": str(user.id)})

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,  # Return same refresh token
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    def request_password_reset(self, request_data: PasswordResetRequest) -> bool:
        """
        Request password reset (generates reset token)

        Args:
            request_data: Password reset request with email

        Returns:
            True if email sent (always returns True for security)
        """
        user = self.db.query(User).filter(User.email == request_data.email).first()

        if user and user.is_active:
            # Generate reset token
            reset_token = generate_reset_token()
            user.reset_token = reset_token
            user.reset_token_expires_at = datetime.utcnow() + timedelta(hours=1)

            self.db.commit()

            # TODO: Send email with reset link
            # For now, just log it (in production, send via email service)
            print(f"Password reset token for {user.email}: {reset_token}")

        # Always return True for security (don't reveal if email exists)
        return True

    def confirm_password_reset(self, confirm_data: PasswordResetConfirm) -> bool:
        """
        Confirm password reset with token

        Args:
            confirm_data: Password reset confirmation data

        Returns:
            True if successful

        Raises:
            HTTPException: If token invalid or expired
        """
        # Find user with reset token
        user = self.db.query(User).filter(
            User.reset_token == confirm_data.token,
            User.reset_token_expires_at > datetime.utcnow()
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )

        # Validate password strength
        is_valid, error_msg = validate_password_strength(confirm_data.new_password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

        # Update password
        user.hashed_password = get_password_hash(confirm_data.new_password)
        user.reset_token = None
        user.reset_token_expires_at = None

        self.db.commit()

        return True

    def _create_user_tokens(self, user: User, device_info: Optional[str] = None) -> TokenResponse:
        """
        Create access and refresh tokens for user

        Args:
            user: User object
            device_info: Optional device information

        Returns:
            TokenResponse with tokens
        """
        # Create access token (sub must be a string for JWT)
        access_token = create_access_token({"sub": str(user.id)})

        # Create refresh token (sub must be a string for JWT)
        refresh_token_str = create_refresh_token({"sub": str(user.id)})

        # Store refresh token in database
        refresh_token = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            device_info=device_info,
            is_active=True,
            is_revoked=False,
        )

        self.db.add(refresh_token)
        self.db.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

    def revoke_refresh_token(self, user_id: int, token_str: Optional[str] = None):
        """
        Revoke refresh token(s) for a user

        Args:
            user_id: User ID
            token_str: Optional specific token to revoke (None = revoke all)
        """
        query = self.db.query(RefreshToken).filter(RefreshToken.user_id == user_id)

        if token_str:
            query = query.filter(RefreshToken.token == token_str)

        tokens = query.all()
        for token in tokens:
            token.is_revoked = True
            token.revoked_at = datetime.utcnow()

        self.db.commit()
