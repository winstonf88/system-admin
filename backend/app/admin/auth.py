from starlette.requests import Request
from starlette.responses import Response
from starlette_admin.auth import AdminUser, AuthProvider
from starlette_admin.exceptions import LoginFailed

from app.core.security import verify_password
from app.models.user import User


class AdminAuthProvider(AuthProvider):
    async def login(
        self,
        username: str,
        password: str,
        remember_me: bool,
        request: Request,
        response: Response,
    ) -> Response:
        user = await User.get_or_none(email=username, is_active=True, is_superuser=True)
        if user is None or not verify_password(password, user.password_hash):
            raise LoginFailed("Invalid credentials")
        request.session["admin_user_id"] = user.id
        return response

    async def is_authenticated(self, request: Request) -> bool:
        user_id = request.session.get("admin_user_id")
        if not user_id:
            return False
        user = await User.get_or_none(id=user_id, is_active=True, is_superuser=True)
        if user is None:
            return False
        request.state.admin_user = user
        return True

    def get_admin_user(self, request: Request) -> AdminUser:
        user = request.state.admin_user
        return AdminUser(username=user.email)

    async def logout(self, request: Request, response: Response) -> Response:
        request.session.clear()
        return response