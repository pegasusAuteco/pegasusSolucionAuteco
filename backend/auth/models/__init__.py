"""
Auth models package.

Re-exports the User ORM model and UserRole enum for convenience.
"""
from auth.models.user import User, UserRole

__all__ = ["User", "UserRole"]
