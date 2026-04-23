import mimetypes
from functools import lru_cache
from pathlib import Path

from agno.agent import Agent
from agno.guardrails.base import BaseGuardrail
from agno.media import Image
from agno.models.openai import OpenAIResponses
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.models import Category, ProductImage
from app.routers.products.common import (
    ProductsService,
    get_products_service,
)
from app.schemas import (
    ProductAISuggestionOutput,
    ProductAISuggestionsResponse,
    ProductSuggestionField,
)

NAME_SUGGESTION_LIMIT = 10
DESCRIPTION_SUGGESTION_LIMIT = 6


router = APIRouter()


class ProductAICategoryContext(BaseModel):
    id: int
    name: str
    parent_id: int | None = None


class ProductAISuggestionInputSchema(BaseModel):
    requested_fields: list[ProductSuggestionField] = Field(min_length=1)
    name_suggestion_count: int = Field(ge=1)
    description_suggestion_count: int = Field(ge=1)
    available_categories: list[ProductAICategoryContext] = Field(default_factory=list)


class ProductAISuggestionInputGuardrail(BaseGuardrail):
    @staticmethod
    def _validate(run_input_model: ProductAISuggestionInputSchema) -> None:
        requested_fields = set(run_input_model.requested_fields)
        if ProductSuggestionField.CATEGORY in requested_fields:
            if not run_input_model.available_categories:
                raise ValueError(
                    "Categoria solicitada, mas nenhuma categoria disponível foi informada."
                )
            category_ids = [
                category.id for category in run_input_model.available_categories
            ]
            if len(category_ids) != len(set(category_ids)):
                raise ValueError("Categorias disponíveis com IDs duplicados.")

    def check(self, run_input) -> None:  # type: ignore[override]
        payload = run_input.input_content
        if isinstance(payload, ProductAISuggestionInputSchema):
            self._validate(payload)
            return
        self._validate(ProductAISuggestionInputSchema.model_validate(payload))

    async def async_check(self, run_input) -> None:  # type: ignore[override]
        self.check(run_input)


def build_image_from_product_image_url(url: str) -> Image:
    if not url.startswith("/uploads/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Imagem do produto inválida para sugestão por IA.",
        )

    relative = url.removeprefix("/uploads/")
    path = Path("uploads") / relative
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo da imagem do produto não encontrado.",
        )

    content = path.read_bytes()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo da imagem do produto está vazio.",
        )

    guessed_mime_type, _ = mimetypes.guess_type(path.name)
    return Image(
        content=content,
        mime_type=guessed_mime_type or "application/octet-stream",
    )


async def build_images_from_product_image_ids(
    *,
    product_image_ids: list[int],
    service: ProductsService,
) -> list[Image]:
    unique_ids: list[int] = []
    seen: set[int] = set()
    for image_id in product_image_ids:
        if image_id in seen:
            continue
        seen.add(image_id)
        unique_ids.append(image_id)

    rows = await ProductImage.filter(
        id__in=unique_ids,
        tenant_id=service.tenant_context.tenant_id,
    )
    by_id = {row.id: row for row in rows}
    missing_ids = [image_id for image_id in unique_ids if image_id not in by_id]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Imagem não encontrada.",
        )

    return [
        build_image_from_product_image_url(by_id[image_id].url)
        for image_id in unique_ids
    ]


@router.post(
    "/ai-suggestions",
    response_model=ProductAISuggestionsResponse,
    response_model_exclude_none=True,
)
async def suggest_product_fields(
    fields: list[ProductSuggestionField] | None = Form(None),
    files: list[UploadFile] | None = File(None),
    product_image_ids: list[int] | None = Form(None),
    service: ProductsService = Depends(get_products_service),
) -> ProductAISuggestionsResponse:
    requested_fields = set(fields or ProductSuggestionField)
    uploaded_files = files or []
    provided_image_ids = product_image_ids or []

    if not uploaded_files and not provided_image_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie ao menos uma imagem ou product_image_ids.",
        )

    images: list[Image] = []
    for uploaded_file in uploaded_files:
        if uploaded_file.filename:
            image_content = await uploaded_file.read()
            if not image_content:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Arquivo vazio: {uploaded_file.filename}.",
                )
            images.append(
                Image(
                    content=image_content,
                    mime_type=uploaded_file.content_type,
                )
            )
            continue

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Falta o nome do arquivo no envio.",
        )

    if provided_image_ids:
        images.extend(
            await build_images_from_product_image_ids(
                product_image_ids=provided_image_ids,
                service=service,
            )
        )

    tenant_categories = []
    if ProductSuggestionField.CATEGORY in requested_fields:
        tenant_categories = await service.list_tenant_categories()

    raw_suggestions = await run_ai_suggestions(
        requested_fields=requested_fields,
        images=images,
        tenant_categories=tenant_categories,
    )

    response_payload: dict[str, list[str] | list[int]] = {}
    if ProductSuggestionField.NAME in requested_fields:
        response_payload["name"] = service.sanitize_text_suggestions(
            raw_suggestions.name,
            limit=NAME_SUGGESTION_LIMIT,
        )
    if ProductSuggestionField.DESCRIPTION in requested_fields:
        response_payload["description"] = service.sanitize_text_suggestions(
            raw_suggestions.description,
            limit=DESCRIPTION_SUGGESTION_LIMIT,
        )
    if ProductSuggestionField.CATEGORY in requested_fields:
        response_payload["category"] = service.sanitize_category_suggestions(
            raw_suggestions.category,
            allowed_category_ids={category.id for category in tenant_categories},
        )

    return ProductAISuggestionsResponse(**response_payload)


@lru_cache
def get_product_suggestion_agent(model_id: str, api_key: str) -> Agent:
    return Agent(
        retries=1,
        telemetry=False,
        markdown=False,
        model=OpenAIResponses(id=model_id, api_key=api_key),
        input_schema=ProductAISuggestionInputSchema,
        output_schema=ProductAISuggestionOutput,
        pre_hooks=[ProductAISuggestionInputGuardrail()],
        role="You only answer in Brazilian Portuguese",
        instructions=[
            "You suggest product metadata from product images.",
            "Use the structured input payload to decide which fields to return.",
            "Use only the category IDs present in available_categories.",
            "Only output JSON that matches the schema.",
            "If a field is not requested, return an empty list for that field.",
            "For names, return exactly name_suggestion_count concise suggestions.",
            "For descriptions, return exactly description_suggestion_count short ecommerce-ready suggestions.",
            "For category, return only IDs from available_categories that make sense for the product.",
        ],
    )


async def run_ai_suggestions(
    *,
    requested_fields: set[ProductSuggestionField],
    images: list[Image],
    tenant_categories: list[Category],
) -> ProductAISuggestionOutput:
    settings = get_settings()
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OPENAI_API_KEY não configurada.",
        )
    agent = get_product_suggestion_agent(
        model_id=settings.openai_model,
        api_key=settings.openai_api_key,
    )
    suggestion_input = ProductAISuggestionInputSchema(
        requested_fields=sorted(requested_fields, key=lambda field: field.value),
        name_suggestion_count=NAME_SUGGESTION_LIMIT,
        description_suggestion_count=DESCRIPTION_SUGGESTION_LIMIT,
        available_categories=[
            ProductAICategoryContext(
                id=category.id,
                name=category.name,
                parent_id=category.parent_id,
            )
            for category in tenant_categories
        ],
    )
    try:
        run_output = agent.run(suggestion_input, images=images)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Falha ao gerar sugestões de produto.",
        ) from exc

    content = run_output.content
    if isinstance(content, ProductAISuggestionOutput):
        return content
    if isinstance(content, dict):
        return ProductAISuggestionOutput.model_validate(content)
    raise HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Resposta inválida do serviço de sugestões.",
    )
