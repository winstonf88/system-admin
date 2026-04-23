from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models import User
from app.routers.users.service import UsersService, get_users_service

router = APIRouter()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    service: UsersService = Depends(get_users_service),
    current_user: User = Depends(get_current_user),
) -> None:
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode excluir sua própria conta.",
        )
    user = await service.get_user_or_404(user_id)
    await user.delete()
