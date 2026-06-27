"""
Authentication module for user registration, login, and JWT-based authorization.

Exports core auth components for convenience:
- User, UserRole: ORM model and role enum
- RegisterRequest, RegisterResponse, LoginRequest, LoginResponse, UserOut: Pydantic schemas
- AuthService: Business logic for auth operations
- auth_router: FastAPI router mounted at /auth
"""
from auth.models import User, UserRole
from auth.schemas import RegisterRequest, RegisterResponse, LoginRequest, LoginResponse, UserOut
from auth.service import AuthService
from auth.router import router as auth_router

__all__ = ["User", "UserRole", "RegisterRequest", "RegisterResponse", "AuthService", "auth_router"]
