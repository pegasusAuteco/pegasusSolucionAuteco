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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    @staticmethod
    def create_access_token(user_id: int) -> str:
        expire = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
        payload = {"sub": str(user_id), "exp": expire}
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    async def authenticate_user(self, email: str, password: str) -> User | None:
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
