from fastapi import APIRouter, Depends, status

from app.core.auth import normalize_email
from app.models import User
from app.routers.users.service import UsersService, get_users_service
from app.schemas import UserCreate, UserRead

router = APIRouter()


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    service: UsersService = Depends(get_users_service),
) -> User:
    email = normalize_email(payload.email)
    await service.ensure_email_available(email)

    user = User(
        email=email,
        first_name=(payload.first_name or "").strip() or None,
        last_name=(payload.last_name or "").strip() or None,
        tenant_id=service.tenant_context.tenant_id,
        is_active=payload.is_active,
    )
    user.set_password(payload.password)
    await user.save()
    return user
