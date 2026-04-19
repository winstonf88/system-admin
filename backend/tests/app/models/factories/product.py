import factory

from app.models import Product


class ProductFactory(factory.Factory):
    class Meta:
        model = Product

    name = factory.Sequence(lambda n: f"Product {n}")
    description = None
    category_id = factory.Sequence(lambda n: n + 1)
    tenant_id = factory.Sequence(lambda n: n + 1)
    image_url = None
