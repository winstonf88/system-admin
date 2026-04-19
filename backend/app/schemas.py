from pydantic import BaseModel, ConfigDict, Field, model_validator


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


class ProductVariationBase(BaseModel):
    size: str | None = Field(default=None, max_length=64)
    color: str | None = Field(default=None, max_length=64)
    quantity: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_dimension(self) -> "ProductVariationBase":
        if not self.size and not self.color:
            raise ValueError("At least one of size or color must be provided.")
        return self


class ProductVariationCreate(ProductVariationBase):
    pass


class ProductVariationRead(ProductVariationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    description: str | None = None
    category_id: int
    image_url: str | None = None


class ProductCreate(ProductBase):
    variations: list[ProductVariationCreate] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = None
    category_id: int | None = None
    image_url: str | None = None
    variations: list[ProductVariationCreate] | None = None


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    category_id: int
    image_url: str | None
    variations: list[ProductVariationRead] = Field(default_factory=list)


class UploadResponse(BaseModel):
    file_url: str


class AuthSessionRead(BaseModel):
    email: str
    tenant_id: int


CategoryTreeRead.model_rebuild()
