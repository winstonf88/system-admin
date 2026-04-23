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

from sqlalchemy import select, update

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))

from app.core.database import engine  # noqa: E402
from app.core.security import hash_api_key  # noqa: E402
from app.models import Tenant  # noqa: E402


async def _find_tenant(tenant_arg: str) -> Tenant | None:
    async with engine.connect() as conn:
        # Try integer id first, then slug
        try:
            tenant_id = int(tenant_arg)
            stmt = select(Tenant).where(Tenant.id == tenant_id).limit(1)
        except ValueError:
            stmt = select(Tenant).where(Tenant.slug == tenant_arg).limit(1)

        result = await conn.execute(stmt)
        row = result.mappings().first()
        return row


async def _write_hash(tenant_id: int, key_hash: str) -> None:
    async with engine.begin() as conn:
        await conn.execute(
            update(Tenant)
            .where(Tenant.id == tenant_id)
            .values(api_key_hash=key_hash)
        )


async def main(tenant_arg: str) -> None:
    tenant = await _find_tenant(tenant_arg)
    if tenant is None:
        print(f"Error: tenant '{tenant_arg}' not found.", file=sys.stderr)
        sys.exit(1)

    raw_key = secrets.token_urlsafe(32)
    key_hash = hash_api_key(raw_key)

    await _write_hash(tenant["id"], key_hash)

    print(f"Tenant:  {tenant['name']} (id={tenant['id']}, slug={tenant['slug']})")
    print(f"API key: {raw_key}")
    print("The key has been stored (hashed) in the database.")


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
