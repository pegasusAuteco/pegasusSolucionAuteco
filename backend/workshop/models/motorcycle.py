import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, Enum as SAEnum, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class RepairStatus(str, enum.Enum):
    PENDING = "pending"
    FINISHED = "finished"


class Motorcycle(Base):
    __tablename__ = "motorcycles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    client_name: Mapped[str] = mapped_column(String(150), nullable=False)
    client_id: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    # UNIQUE enforced at DB level to guarantee one active entry per plate
    plate: Mapped[str] = mapped_column(String(10), nullable=False, unique=True, index=True)
    mileage: Mapped[int] = mapped_column(Integer, nullable=False)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    observations: Mapped[str] = mapped_column(Text, nullable=False)
    mechanic_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[RepairStatus] = mapped_column(
        SAEnum(RepairStatus, values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=RepairStatus.PENDING,
    )
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

    parts: Mapped[list["Part"]] = relationship(
        "Part",
        back_populates="motorcycle",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class Part(Base):
    __tablename__ = "parts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    motorcycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motorcycles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    motorcycle: Mapped["Motorcycle"] = relationship("Motorcycle", back_populates="parts")
