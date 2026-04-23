from fastapi import APIRouter, Depends

from app.models import User
from app.routers.users.service import UsersService, get_users_service
from app.schemas import UserRead

router = APIRouter()


@router.get("/", response_model=list[UserRead])
async def list_users(service: UsersService = Depends(get_users_service)) -> list[User]:
    return await User.filter(tenant_id=service.tenant_context.tenant_id).order_by("email")
