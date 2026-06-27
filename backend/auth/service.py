"""
Authentication service with password hashing, JWT token generation,
user registration, and credential validation logic.
"""
import logging
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth.models import User, UserRole
from config import settings
from database import async_session_factory

logger = logging.getLogger(__name__)

# bcrypt password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """
    Service class for authentication operations.

    Provides static methods for password hashing/verification and JWT creation,
    plus async methods for user registration and login authentication.
    """

    @staticmethod
    def hash_password(password: str) -> str:
        """Hashes a plaintext password using bcrypt."""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        """Verifies a plaintext password against a bcrypt hash."""
        return pwd_context.verify(plain, hashed)

    @staticmethod
    def create_access_token(user_id: int) -> str:
        """
        Creates a JWT access token for the given user ID.

        Token expires after JWT_EXPIRATION_HOURS (default 24h).
        """
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
        payload = {"sub": str(user_id), "exp": expire}
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    async def authenticate_user(self, email: str, password: str) -> User | None:
        """
        Authenticates a user by email and password.

        Returns the User object if credentials are valid, None otherwise.
        """
        async with async_session_factory() as session:
            result = await session.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if not user or not self.verify_password(password, user.password_hash):
                return None
            return user

    async def register_user(
        self,
        nombre: str,
        email: str,
        password: str,
        accept_terms: bool,
        empresa_taller: str | None = None,
    ) -> User:
        """
        Registers a new user with the given details.

        Raises:
            ValueError: If the email is already registered.

        Returns:
            The newly created User object.
        """
        async with async_session_factory() as session:
            existing = await session.execute(select(User).where(User.email == email))
            if existing.scalar_one_or_none():
                raise ValueError("Este correo ya está registrado")

            user = User(
                nombre=nombre,
                email=email,
                password_hash=self.hash_password(password),
                accept_terms=accept_terms,
                rol=UserRole.EMPLOYEE,
                empresa_taller=empresa_taller,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            logger.info(f"User registered: {user.email} (id={user.id})")
            return user
