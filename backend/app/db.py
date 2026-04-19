"""Compatibility module; use app.core.database for new imports."""

from app.core.database import SessionLocal, check_db_connection, engine, get_db

__all__ = ["SessionLocal", "check_db_connection", "engine", "get_db"]
