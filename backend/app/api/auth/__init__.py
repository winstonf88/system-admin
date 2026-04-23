from fastapi import APIRouter

from app.routers.auth.get_session import router as get_session_router

router = APIRouter(prefix="/api/auth", tags=["auth"])
router.include_router(get_session_router)

__all__ = ["router"]
