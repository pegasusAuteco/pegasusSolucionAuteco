from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel

from database import get_session
from auth.models.user import User, UserRole

router = APIRouter()

class UserRoleUpdate(BaseModel):
    role: UserRole

@router.get("/users", summary="Listar todos los usuarios")
async def get_all_users(db: AsyncSession = Depends(get_session)):
    try:
        stmt = select(User).order_by(User.created_at.desc())
        result = await db.execute(stmt)
        users = result.scalars().all()
        
        return [
            {
                "id": str(u.id),
                "email": u.email,
                "name": u.nombre,
                "role": u.rol.value,
                "created_at": u.created_at.isoformat()
            }
            for u in users
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/users/{user_id}/role", summary="Actualizar rol de un usuario")
async def update_user_role(user_id: int, payload: UserRoleUpdate, db: AsyncSession = Depends(get_session)):
    try:
        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(rol=payload.role)
        )
        result = await db.execute(stmt)
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        await db.commit()
        return {"message": "Rol actualizado correctamente"}
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
