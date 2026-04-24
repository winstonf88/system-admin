from fastapi import APIRouter

from app.api.users.create_user import router as create_user_router
from app.api.users.delete_user import router as delete_user_router
from app.api.users.get_user import router as get_user_router
from app.api.users.list_users import router as list_users_router
from app.api.users.update_user import router as update_user_router

router = APIRouter(prefix="/api/users", tags=["users"])
router.include_router(list_users_router)
router.include_router(create_user_router)
router.include_router(get_user_router)
router.include_router(update_user_router)
router.include_router(delete_user_router)

__all__ = ["router"]
