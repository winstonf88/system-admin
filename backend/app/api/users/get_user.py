from fastapi import APIRouter, Depends

from app.models import User
from app.api.users.service import UsersService, get_users_service
from app.schemas import UserRead

router = APIRouter()


@router.get("/{user_id}", response_model=UserRead)
async def get_user(user_id: int, service: UsersService = Depends(get_users_service)) -> User:
    return await service.get_user_or_404(user_id)
