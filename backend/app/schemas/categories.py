from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    parent_id: int | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    parent_id: int | None = None


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    parent_id: int | None


class CategoryTreeRead(CategoryRead):
    subcategories: list["CategoryTreeRead"] = Field(default_factory=list)
