from fastapi import APIRouter, Depends

from app.core.auth import normalize_email
from app.models import User
from app.routers.users.service import UsersService, get_users_service
from app.schemas import UserRead, UserUpdate

router = APIRouter()


@router.put("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    service: UsersService = Depends(get_users_service),
) -> User:
    user = await service.get_user_or_404(user_id)

    if "email" in payload.model_fields_set and payload.email is not None:
        email = normalize_email(payload.email)
        await service.ensure_email_available(email, exclude_user_id=user.id)
        user.email = email

    if "first_name" in payload.model_fields_set:
        user.first_name = (payload.first_name or "").strip() or None

    if "last_name" in payload.model_fields_set:
        user.last_name = (payload.last_name or "").strip() or None

    if "is_active" in payload.model_fields_set and payload.is_active is not None:
        user.is_active = payload.is_active

    if "password" in payload.model_fields_set and payload.password:
        user.set_password(payload.password)

    await user.save()
    return user
