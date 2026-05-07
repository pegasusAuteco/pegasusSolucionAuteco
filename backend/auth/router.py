from fastapi import APIRouter, HTTPException

from auth.schemas import RegisterRequest, RegisterResponse
from auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(payload: RegisterRequest):
    service = AuthService()
    try:
        user = await service.register_user(
            nombre=payload.nombre,
            email=payload.email,
            password=payload.password,
            accept_terms=payload.accept_terms,
            empresa_taller=payload.empresa_taller,
        )
        return RegisterResponse(
            id=user.id,
            nombre=user.nombre,
            email=user.email,
            rol=user.rol.value,
            empresa_taller=user.empresa_taller,
            created_at=user.created_at.isoformat(),
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error interno del servidor")
