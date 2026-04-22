import factory

from app.models import Product


class ProductFactory(factory.Factory):
    class Meta:
        model = Product

    name = factory.Sequence(lambda n: f"Product {n}")
    price = 0
    description = None
    tenant_id = factory.Sequence(lambda n: n + 1)
    image_url = None
