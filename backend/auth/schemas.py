import re
from pydantic import BaseModel, field_validator
from typing import Optional


# ── Registration payload ──────────────────────────────────────────────────────
# Validates all fields before they reach the service layer.
# Password rules and rol whitelist must stay in sync with the frontend
# validation schema in web/src/pages/RegisterPage.tsx.
class RegisterRequest(BaseModel):
    nombre: str
    email: str
    password: str
    accept_terms: bool
    # Defaults to mecanico; admin role is assigned manually, never via self-registration.
    rol: str = "mecanico"
    empresa_taller: Optional[str] = None

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v):
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_valido(cls, v):
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, v):
            raise ValueError("Formato de email inválido")
        return v.lower().strip()

    # Password policy: 8–12 chars, at least one uppercase, one lowercase, one digit.
    @field_validator("password")
    @classmethod
    def password_segura(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if len(v) > 12:
            raise ValueError("La contraseña no puede tener más de 12 caracteres")
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una mayúscula")
        if not re.search(r"[a-z]", v):
            raise ValueError("La contraseña debe contener al menos una minúscula")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v

    # Only mecanico and secretario can self-register.
    @field_validator("rol")
    @classmethod
    def rol_valido(cls, v):
        if v not in {"mecanico", "secretario"}:
            raise ValueError("Rol debe ser mecanico o secretario")
        return v

    @field_validator("accept_terms")
    @classmethod
    def debe_aceptar_terminos(cls, v):
        if not v:
            raise ValueError("Debes aceptar los términos y condiciones")
        return v


# ── Registration response ─────────────────────────────────────────────────────
# Returned after a successful POST /auth/register. Does not include password_hash.
class RegisterResponse(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    empresa_taller: Optional[str] = None
    created_at: str


# ── Login payload and responses ───────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ErrorResponse(BaseModel):
    detail: str
