from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_utils.cbv import cbv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, normalize_email
from app.core.database import get_db
from app.core.tenant import TenantContext, get_tenant_context
from app.models import User
from app.schemas import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


@cbv(router)
class UserView:
    db: AsyncSession = Depends(get_db)
    tenant_context: TenantContext = Depends(get_tenant_context)

    async def _get_user_or_404(self, user_id: int) -> User:
        result = await self.db.execute(
            select(User).where(
                User.id == user_id,
                User.tenant_id == self.tenant_context.tenant_id,
            )
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        return user

    async def _ensure_email_available(self, email: str, exclude_user_id: int | None = None) -> None:
        q = select(User.id).where(User.email == email)
        if exclude_user_id is not None:
            q = q.where(User.id != exclude_user_id)
        taken = await self.db.scalar(q.limit(1))
        if taken is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists.",
            )

    @router.get("/", response_model=list[UserRead])
    async def list_users(self) -> list[User]:
        result = await self.db.execute(
            select(User)
            .where(User.tenant_id == self.tenant_context.tenant_id)
            .order_by(User.email.asc())
        )
        return list(result.scalars().all())

    @router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
    async def create_user(self, payload: UserCreate) -> User:
        email = normalize_email(payload.email)
        await self._ensure_email_available(email)

        user = User(
            email=email,
            first_name=(payload.first_name or "").strip() or None,
            last_name=(payload.last_name or "").strip() or None,
            tenant_id=self.tenant_context.tenant_id,
            is_active=payload.is_active,
        )
        user.set_password(payload.password)
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    @router.get("/{user_id}", response_model=UserRead)
    async def get_user(self, user_id: int) -> User:
        return await self._get_user_or_404(user_id)

    @router.put("/{user_id}", response_model=UserRead)
    async def update_user(self, user_id: int, payload: UserUpdate) -> User:
        user = await self._get_user_or_404(user_id)

        if "email" in payload.model_fields_set and payload.email is not None:
            email = normalize_email(payload.email)
            await self._ensure_email_available(email, exclude_user_id=user.id)
            user.email = email

        if "first_name" in payload.model_fields_set:
            user.first_name = (payload.first_name or "").strip() or None

        if "last_name" in payload.model_fields_set:
            user.last_name = (payload.last_name or "").strip() or None

        if "is_active" in payload.model_fields_set and payload.is_active is not None:
            user.is_active = payload.is_active

        if "password" in payload.model_fields_set and payload.password:
            user.set_password(payload.password)

        await self.db.commit()
        await self.db.refresh(user)
        return user

    @router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_user(self, user_id: int, current_user: User = Depends(get_current_user)) -> None:
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot delete your own account.",
            )
        user = await self._get_user_or_404(user_id)
        await self.db.delete(user)
        await self.db.commit()
