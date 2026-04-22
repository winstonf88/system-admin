import mimetypes
from functools import lru_cache
from pathlib import Path

from agno.agent import Agent
from agno.media import Image
from agno.models.openai import OpenAIResponses
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select

from app.core.config import get_settings
from app.models import Category, ProductImage
from app.routers.products.common import (
    ProductAISuggestionOutput,
    ProductsService,
    get_products_service,
)
from app.schemas import ProductAISuggestionsResponse, ProductSuggestionField

NAME_SUGGESTION_LIMIT = 10
DESCRIPTION_SUGGESTION_LIMIT = 6


router = APIRouter()


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

    result = await service.db.execute(
        select(ProductImage).where(
            ProductImage.id.in_(unique_ids),
            ProductImage.tenant_id == service.tenant_context.tenant_id,
        )
    )
    rows = list(result.scalars().all())
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

    from pprint import pprint
    pprint(response_payload)
    return ProductAISuggestionsResponse(**response_payload)


@lru_cache
def get_product_suggestion_agent(model_id: str, api_key: str) -> Agent:
    return Agent(
        retries=1,
        markdown=False,
        model=OpenAIResponses(id=model_id, api_key=api_key),
        output_schema=ProductAISuggestionOutput,
        role="You only answer in Brazilian Portuguese",
        instructions=[
            "You suggest product metadata from product images.",
            "Only output JSON that matches the schema.",
            "If a field is not requested, return an empty list for that field.",
            "For names, provide concise product names.",
            "For descriptions, provide short ecommerce-ready descriptions.",
            "For category, return only IDs from provided categories.",
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
    requested_field_names = sorted(field.value for field in requested_fields)
    categories_context = [
        {"id": category.id, "name": category.name, "parent_id": category.parent_id}
        for category in tenant_categories
    ]
    prompt = (
        "Analyze the product images and suggest values only for the requested fields.\n"
        f"requested_fields={requested_field_names}\n"
        f"name_suggestion_count={NAME_SUGGESTION_LIMIT}\n"
        f"description_suggestion_count={DESCRIPTION_SUGGESTION_LIMIT}\n"
        f"available_categories={categories_context}\n"
        "Rules:\n"
        "- If name is requested, return exactly name_suggestion_count suggestions.\n"
        "- If description is requested, return exactly description_suggestion_count suggestions.\n"
        "- If category is requested, return category ids that make sense for the product.\n"
        "- Category ids must be chosen only from available_categories ids.\n"
        "- If a field is not requested, return an empty list for that field.\n"
    )
    try:
        run_output = agent.run(prompt, images=images)
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
