from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.core.security import verify_password
from app.models import User

http_basic = HTTPBasic(auto_error=False)


def normalize_email(email: str) -> str:
    return email.strip().lower()


async def _authenticate_user(credentials: HTTPBasicCredentials) -> User:
    """Validate Basic auth credentials and return the authenticated User.

    Raises HTTPException on invalid credentials, inactive user, or inactive tenant.
    """
    email = normalize_email(credentials.username)
    user = await User.filter(email=email).select_related("tenant").first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Basic"},
        )

    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas",
            headers={"WWW-Authenticate": "Basic"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="A conta está desativada."
        )

    tenant = await user.tenant
    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A organização está desativada.",
        )

    return user


async def get_current_user(
    credentials: HTTPBasicCredentials | None = Depends(http_basic),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado",
            headers={"WWW-Authenticate": "Basic"},
        )
    return await _authenticate_user(credentials)
