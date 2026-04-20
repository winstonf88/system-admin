from pydantic import BaseModel


class AuthSessionRead(BaseModel):
    id: int
    email: str
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool
