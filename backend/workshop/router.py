"""
Workshop router.
Handles motorcycle registration and parts management for the repair shop.
"""
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from jose import jwt, JWTError

from config import settings
from database import get_session
from workshop.models.motorcycle import Motorcycle, Part, RepairStatus
from workshop.schemas import (
    MotorcycleCreate,
    MotorcycleUpdate,
    MotorcycleResponse,
    PartCreate,
    PartResponse,
)

router = APIRouter(prefix="/workshop", tags=["Workshop"])
security = HTTPBearer()
logger = logging.getLogger(__name__)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


# ─── Motorcycles ──────────────────────────────────────────────────────────────

@router.post("/motorcycles", response_model=MotorcycleResponse, status_code=201)
async def register_motorcycle(
    body: MotorcycleCreate,
    _user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    moto = Motorcycle(
        client_name=body.client_name,
        client_id=body.client_id,
        email=body.email,
        model=body.model,
        plate=body.plate,
        mileage=body.mileage,
        entry_date=body.entry_date,
        observations=body.observations,
    )
    session.add(moto)
    try:
        await session.commit()
        await session.refresh(moto)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"La placa {body.plate} ya está registrada en el sistema.",
        )
    return moto


@router.get("/motorcycles", response_model=list[MotorcycleResponse])
async def list_motorcycles(
    status: RepairStatus | None = None,
    _user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Motorcycle).order_by(Motorcycle.created_at.desc())
    if status is not None:
        stmt = stmt.where(Motorcycle.status == status)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.patch("/motorcycles/{motorcycle_id}", response_model=MotorcycleResponse)
async def update_motorcycle(
    motorcycle_id: uuid.UUID,
    body: MotorcycleUpdate,
    _user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    moto = await session.get(Motorcycle, motorcycle_id)
    if not moto:
        raise HTTPException(status_code=404, detail="Moto no encontrada")
    update_data = body.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(moto, field, value)
    await session.commit()
    await session.refresh(moto)
    return moto


@router.patch("/motorcycles/{motorcycle_id}/finish", response_model=MotorcycleResponse)
async def finish_repair(
    motorcycle_id: uuid.UUID,
    _user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    moto = await session.get(Motorcycle, motorcycle_id)
    if not moto:
        raise HTTPException(status_code=404, detail="Moto no encontrada")
    moto.status = RepairStatus.FINISHED
    await session.commit()
    await session.refresh(moto)
    return moto


@router.delete("/motorcycles/{motorcycle_id}", status_code=204)
async def delete_motorcycle(
    motorcycle_id: uuid.UUID,
    _user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    moto = await session.get(Motorcycle, motorcycle_id)
    if not moto:
        raise HTTPException(status_code=404, detail="Moto no encontrada")
    await session.delete(moto)
    await session.commit()


# ─── Parts ────────────────────────────────────────────────────────────────────

@router.post(
    "/motorcycles/{motorcycle_id}/parts",
    response_model=PartResponse,
    status_code=201,
)
async def add_part(
    motorcycle_id: uuid.UUID,
    body: PartCreate,
    _user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    moto = await session.get(Motorcycle, motorcycle_id)
    if not moto:
        raise HTTPException(status_code=404, detail="Moto no encontrada")
    part = Part(motorcycle_id=motorcycle_id, name=body.name, quantity=body.quantity)
    session.add(part)
    await session.commit()
    await session.refresh(part)
    return part


@router.delete("/motorcycles/{motorcycle_id}/parts/{part_id}", status_code=204)
async def remove_part(
    motorcycle_id: uuid.UUID,
    part_id: uuid.UUID,
    _user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Part).where(Part.id == part_id, Part.motorcycle_id == motorcycle_id)
    )
    part = result.scalar_one_or_none()
    if not part:
        raise HTTPException(status_code=404, detail="Repuesto no encontrado")
    await session.delete(part)
    await session.commit()
