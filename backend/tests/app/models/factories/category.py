import factory

from app.models import Category


class CategoryFactory(factory.Factory):
    class Meta:
        model = Category

    name = factory.Sequence(lambda n: f"Category {n}")
    parent_id = None
    tenant_id = factory.Sequence(lambda n: n + 1)
