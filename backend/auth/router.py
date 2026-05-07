import logging

from fastapi import APIRouter, HTTPException

from auth.schemas import RegisterRequest, RegisterResponse, LoginRequest, LoginResponse, UserOut
from auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


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
        logger.exception("Unexpected error in register endpoint")
        raise HTTPException(status_code=500, detail="Error interno del servidor")


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    service = AuthService()
    try:
        user = await service.authenticate_user(payload.email, payload.password)
        if not user:
            raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
        token = service.create_access_token(user.id)
        return LoginResponse(
            access_token=token,
            user=UserOut(
                id=str(user.id),
                email=user.email,
                name=user.nombre,
                role=user.rol.value,
                created_at=user.created_at.isoformat(),
            ),
        )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Unexpected error in login endpoint")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
