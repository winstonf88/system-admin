from pydantic import BaseModel, ConfigDict, Field


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    first_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    is_active: bool = True


class UserUpdate(BaseModel):
    email: str | None = Field(default=None, min_length=3, max_length=255)
    first_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)
