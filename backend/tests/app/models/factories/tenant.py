import itertools

from app.models import Tenant

_tenant_counter = itertools.count(1)


async def create_tenant(*, slug: str | None = None, name: str | None = None, is_active: bool = True) -> Tenant:
    n = next(_tenant_counter)
    slug = slug or f"t{n}"
    name = name or f"Tenant {slug}"
    return await Tenant.create(slug=slug, name=name, is_active=is_active)
