"""
Pydantic schemas for the Workshop module.
Defines request and response models for motorcycles and parts endpoints.
"""
import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator

from workshop.models.motorcycle import RepairStatus


class PartCreate(BaseModel):
    name: str
    quantity: int = 1

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v):
        if not v.strip():
            raise ValueError("El nombre del repuesto no puede estar vacío")
        return v.strip()

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v):
        if v < 1:
            raise ValueError("La cantidad debe ser mayor a 0")
        return v


class PartResponse(BaseModel):
    id: uuid.UUID
    motorcycle_id: uuid.UUID
    name: str
    quantity: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MotorcycleCreate(BaseModel):
    client_name: str
    client_id: str
    email: Optional[str] = None
    model: str
    plate: str
    mileage: int
    entry_date: date
    observations: str

    @field_validator("plate")
    @classmethod
    def plate_to_upper(cls, v):
        return v.strip().upper()

    @field_validator("client_name", "model", "observations")
    @classmethod
    def not_empty(cls, v):
        if not v.strip():
            raise ValueError("Este campo no puede estar vacío")
        return v.strip()

    @field_validator("mileage")
    @classmethod
    def mileage_non_negative(cls, v):
        if v < 0:
            raise ValueError("El kilometraje no puede ser negativo")
        return v


class MotorcycleUpdate(BaseModel):
    client_name: Optional[str] = None
    client_id: Optional[str] = None
    email: Optional[str] = None
    model: Optional[str] = None
    mileage: Optional[int] = None
    observations: Optional[str] = None
    mechanic_notes: Optional[str] = None


class MotorcycleResponse(BaseModel):
    id: uuid.UUID
    client_name: str
    client_id: str
    email: Optional[str]
    model: str
    plate: str
    mileage: int
    entry_date: date
    observations: str
    mechanic_notes: Optional[str]
    status: RepairStatus
    created_at: datetime
    updated_at: datetime
    parts: list[PartResponse] = []

    model_config = {"from_attributes": True}
