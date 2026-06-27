"""
User SQLAlchemy ORM model and role definitions.

Defines the 'usuarios' table schema and the UserRole enum
that controls access levels throughout the application.
"""
import enum
from datetime import datetime, timezone

from sqlalchemy import String, Boolean, Enum as SAEnum, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class UserRole(str, enum.Enum):
    """User role enumeration for access control."""
    EMPLOYEE = "employee"
    ADMIN = "admin"
    MECANICO = "mecanico"
    SECRETARIO = "secretario"


class User(Base):
    """
    User ORM model mapped to the 'usuarios' table.

    Stores user credentials, profile information, and role assignment.
    Passwords are stored as bcrypt hashes (never plaintext).
    """
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    accept_terms: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    rol: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=UserRole.EMPLOYEE,
    )
    empresa_taller: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
