"""
Script to create default test users for development/testing.

Creates a SECRETARIO and MECANICO user if they don't exist,
or resets their password and role if they already exist.

Usage:
    python create_test_users.py
"""
import asyncio
from sqlalchemy import select
from database import async_session_factory, engine, Base
from auth.models import User, UserRole
from auth.service import AuthService

async def create_users():
    """
    Creates or updates test users (SECRETARIO and MECANICO roles).

    For each user in the predefined list, checks if the email exists.
    If so, resets the password and role; otherwise creates a new user.
    """
    users_to_create = [
        {
            "email": "secretario@pegasus.com",
            "password": "TallerPassword123!",
            "nombre": "Secretario de Prueba",
            "rol": UserRole.SECRETARIO
        },
        {
            "email": "mecanico@pegasus.com",
            "password": "TallerPassword123!",
            "nombre": "Mecánico de Prueba",
            "rol": UserRole.MECANICO
        }
    ]
    auth_service = AuthService()
    async with async_session_factory() as session:
        for user_data in users_to_create:
            hashed_password = auth_service.hash_password(user_data["password"])
            result = await session.execute(select(User).where(User.email == user_data["email"]))
            existing_user = result.scalar_one_or_none()
            if existing_user:
                print(f"User {user_data['email']} already exists. Resetting password and role...")
                existing_user.rol = user_data["rol"]
                existing_user.nombre = user_data["nombre"]
                existing_user.password_hash = hashed_password
            else:
                print(f"Creating user: {user_data['email']} with role {user_data['rol']}")
                user = User(
                    nombre=user_data["nombre"],
                    email=user_data["email"],
                    password_hash=hashed_password,
                    accept_terms=True,
                    rol=user_data["rol"]
                )
                session.add(user)
        await session.commit()
        print("Test users created/updated successfully.")

if __name__ == "__main__":
    asyncio.run(create_users())
