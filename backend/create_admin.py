import asyncio
from sqlalchemy import select
from database import async_session_factory
from auth.models import User, UserRole
from auth.service import AuthService
from config import settings

async def create_admin():
    email = "admin@pegasus.com"
    password = "AdminPassword123!"
    nombre = "Administrador"
    
    auth_service = AuthService()
    hashed_password = auth_service.hash_password(password)
    
    async with async_session_factory() as session:
        # Check if user already exists
        result = await session.execute(select(User).where(User.email == email))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"Usuario {email} ya existe. Actualizando a ADMIN...")
            existing_user.rol = UserRole.ADMIN
            existing_user.nombre = nombre
            existing_user.password_hash = hashed_password
        else:
            print(f"Creando usuario administrador: {email}")
            user = User(
                nombre=nombre,
                email=email,
                password_hash=hashed_password,
                accept_terms=True,
                rol=UserRole.ADMIN
            )
            session.add(user)
        
        await session.commit()
        print("✅ Administrador creado/actualizado con éxito.")
        print(f"📧 Email: {email}")
        print(f"🔑 Password: {password}")

if __name__ == "__main__":
    asyncio.run(create_admin())
