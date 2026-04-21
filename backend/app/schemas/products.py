from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


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


class ProductImageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str


class ProductImageOrderUpdate(BaseModel):
    image_ids: list[int] = Field(min_length=1)

    @field_validator("image_ids")
    @classmethod
    def unique_image_ids(cls, v: list[int]) -> list[int]:
        if len(set(v)) != len(v):
            raise ValueError("image_ids must not contain duplicates.")
        return v


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    description: str | None = None
    category_ids: list[int] = Field(min_length=1)
    image_url: str | None = None

    @field_validator("category_ids")
    @classmethod
    def unique_category_ids(cls, v: list[int]) -> list[int]:
        if len(set(v)) != len(v):
            raise ValueError("category_ids must not contain duplicates.")
        return v


class ProductCreate(ProductBase):
    variations: list[ProductVariationCreate] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = None
    category_ids: list[int] | None = None
    image_url: str | None = None
    variations: list[ProductVariationCreate] | None = None

    @field_validator("category_ids")
    @classmethod
    def category_ids_not_empty_when_set(cls, v: list[int] | None) -> list[int] | None:
        if v is not None and len(v) == 0:
            raise ValueError("At least one category is required.")
        if v is not None and len(set(v)) != len(v):
            raise ValueError("category_ids must not contain duplicates.")
        return v


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    category_ids: list[int]
    image_url: str | None
    images: list[ProductImageRead] = Field(default_factory=list)
    variations: list[ProductVariationRead] = Field(default_factory=list)


class UploadResponse(BaseModel):
    file_url: str


class ProductSuggestionField(str, Enum):
    NAME = "name"
    DESCRIPTION = "description"
    CATEGORY = "category"


class ProductAISuggestionsResponse(BaseModel):
    name: list[str] | None = None
    description: list[str] | None = None
    category: list[int] | None = None
