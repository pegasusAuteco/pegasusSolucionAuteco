import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from jose import jwt, JWTError

from config import settings
from workshop.schemas import MotorcycleCompletedResponse
from workshop.service import WorkshopService

router = APIRouter(prefix="/workshop", tags=["Workshop"])
security = HTTPBearer()
logger = logging.getLogger(__name__)


# ── JWT dependency ────────────────────────────────────────────────────────────
# Validates the Bearer token and returns the user id stored in the sub claim.
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


# ── POST /workshop/motorcycles/{id}/complete ──────────────────────────────────
# Marks a repair as finished. Atomically moves the motorcycle record from
# 'motorcycles' into 'motorcycles_completed' via a Supabase RPC call.
# Returns the archived record on success.
@router.post(
    "/motorcycles/{motorcycle_id}/complete",
    response_model=MotorcycleCompletedResponse,
    status_code=200,
)
async def complete_motorcycle(
    motorcycle_id: str,
    user_id: str = Depends(get_current_user_id),
):
    service = WorkshopService()
    try:
        result = await service.complete_motorcycle(motorcycle_id)
        logger.info(f"Motorcycle {motorcycle_id} completed by user {user_id}")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
