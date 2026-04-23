"""Generate and store an API key for a tenant.

Usage:
    uv run python scripts/generate_api_key.py --tenant <id_or_slug>

The raw key is printed to stdout once. Store it securely — it cannot be
retrieved again. The SHA-256 hash is written to tenants.api_key_hash.
"""

import argparse
import asyncio
import secrets
import sys

from tortoise import Tortoise

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))

from app.core.database import TORTOISE_ORM  # noqa: E402
from app.core.security import hash_api_key  # noqa: E402
from app.models import Tenant  # noqa: E402


async def main(tenant_arg: str) -> None:
    await Tortoise.init(config=TORTOISE_ORM)
    try:
        try:
            tenant_id = int(tenant_arg)
            tenant = await Tenant.get_or_none(id=tenant_id)
        except ValueError:
            tenant = await Tenant.get_or_none(slug=tenant_arg)

        if tenant is None:
            print(f"Error: tenant '{tenant_arg}' not found.", file=sys.stderr)
            sys.exit(1)

        raw_key = secrets.token_urlsafe(32)
        key_hash = hash_api_key(raw_key)
        tenant.api_key_hash = key_hash
        await tenant.save(update_fields=["api_key_hash"])

        print(f"Tenant:  {tenant.name} (id={tenant.id}, slug={tenant.slug!r})")
        print(f"API key: {raw_key}")
        print("The key has been stored (hashed) in the database.")
    finally:
        await Tortoise.close_connections()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate an API key for a tenant.")
    parser.add_argument(
        "--tenant",
        required=True,
        metavar="ID_OR_SLUG",
        help="Tenant id (integer) or slug (string)",
    )
    args = parser.parse_args()
    asyncio.run(main(args.tenant))
