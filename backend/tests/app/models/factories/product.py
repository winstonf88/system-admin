from app.models import Product


async def create_product(
    *,
    tenant_id: int,
    name: str,
    price: float = 10.0,
    description: str | None = None,
    image_url: str | None = None,
) -> Product:
    return await Product.create(
        tenant_id=tenant_id,
        name=name,
        price=price,
        description=description,
        image_url=image_url,
    )
