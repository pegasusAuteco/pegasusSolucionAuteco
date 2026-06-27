"""
Script to create or update the default admin user.

Creates a user with ADMIN role if it doesn't exist, or upgrades
an existing user to ADMIN if the email already exists.

Usage:
    python create_admin.py
"""
import asyncio
from sqlalchemy import select
from database import async_session_factory, engine, Base
from auth.models import User, UserRole
from auth.service import AuthService

async def create_admin():
    """
    Creates or updates the default admin user in the database.

    Ensures all tables exist first, then checks if the admin email
    is already registered. If so, it updates the role to ADMIN.
    """
    # Ensure database tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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
            print(f"User {email} already exists. Upgrading to ADMIN...")
            existing_user.rol = UserRole.ADMIN
            existing_user.nombre = nombre
            existing_user.password_hash = hashed_password
        else:
            print(f"Creating admin user: {email}")
            user = User(
                nombre=nombre,
                email=email,
                password_hash=hashed_password,
                accept_terms=True,
                rol=UserRole.ADMIN
            )
            session.add(user)
        
        await session.commit()
        print("Admin user created/updated successfully.")
        print(f"Email: {email}")
        print(f"Password: {password}")

if __name__ == "__main__":
    asyncio.run(create_admin())
