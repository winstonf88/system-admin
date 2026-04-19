import factory

from app.models import Tenant


class TenantFactory(factory.Factory):
    class Meta:
        model = Tenant

    id = factory.Sequence(lambda n: n + 1)
    slug = factory.Sequence(lambda n: f"t{n}")
    name = factory.LazyAttribute(lambda o: f"Tenant {o.slug}")
