import re
from pydantic import BaseModel, field_validator
from typing import Optional


class RegisterRequest(BaseModel):
    nombre: str
    email: str
    password: str
    accept_terms: bool
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

    @field_validator("password")
    @classmethod
    def password_segura(cls, v):
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if len(v) > 128:
            raise ValueError("La contraseña no puede tener más de 128 caracteres")
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una mayúscula")
        if not re.search(r"[a-z]", v):
            raise ValueError("La contraseña debe contener al menos una minúscula")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v

    @field_validator("accept_terms")
    @classmethod
    def debe_aceptar_terminos(cls, v):
        if not v:
            raise ValueError("Debes aceptar los términos y condiciones")
        return v


class RegisterResponse(BaseModel):
    id: int
    nombre: str
    email: str
    rol: str
    empresa_taller: Optional[str] = None
    created_at: str


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
