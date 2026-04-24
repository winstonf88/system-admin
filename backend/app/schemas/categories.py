from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    parent_id: int | None = None
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    parent_id: int | None = None
    is_active: bool | None = None


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    parent_id: int | None
    sort_order: int
    is_active: bool


class CategoryTreeRead(CategoryRead):
    product_count: int = 0
    subcategories: list["CategoryTreeRead"] = Field(default_factory=list)


class CategoryReorder(BaseModel):
    parent_id: int | None = None
    ordered_ids: list[int] = Field(min_length=1)
