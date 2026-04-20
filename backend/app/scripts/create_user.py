"""Create a tenant (optional) and user with a hashed password. From `backend/`:

    uv sync --extra dev
    uv run python -m app.scripts.create_user --email admin@example.com --password secret --tenant-slug default --create-tenant

Requires DATABASE_URL (or default in Settings) and existing tables (start the API once or use create_all).
"""

from __future__ import annotations

import argparse
import asyncio

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import Tenant, User


async def _run(
    email: str,
    password: str,
    tenant_slug: str,
    tenant_name: str | None,
    new_tenant: bool,
    first_name: str | None,
    last_name: str | None,
) -> None:
    email_norm = email.strip().lower()
    async with SessionLocal() as session:
        if new_tenant:
            taken = await session.scalar(
                select(Tenant.id).where(Tenant.slug == tenant_slug).limit(1)
            )
            if taken is not None:
                raise SystemExit(f"Tenant slug already exists: {tenant_slug!r}")
            tenant = Tenant(slug=tenant_slug, name=tenant_name or tenant_slug)
            session.add(tenant)
            await session.flush()
        else:
            result = await session.execute(
                select(Tenant).where(Tenant.slug == tenant_slug).limit(1)
            )
            tenant = result.scalar_one_or_none()
            if tenant is None:
                raise SystemExit(
                    f"No tenant with slug={tenant_slug!r}; use --create-tenant to create one."
                )

        existing = await session.scalar(
            select(User.id).where(User.email == email_norm).limit(1)
        )
        if existing is not None:
            raise SystemExit(f"User already exists: {email_norm}")

        user = User(
            email=email_norm,
            first_name=first_name,
            last_name=last_name,
            password_hash=hash_password(password),
            tenant_id=tenant.id,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        print(
            f"Created user {email_norm} for tenant id={tenant.id} slug={tenant.slug!r}"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a user linked to a tenant.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument(
        "--tenant-slug", default="default", help="Tenant slug (existing or new)."
    )
    parser.add_argument(
        "--tenant-name", default=None, help="Display name when creating a new tenant."
    )
    parser.add_argument(
        "--create-tenant",
        action="store_true",
        help="Create tenant with --tenant-slug if missing (uses --tenant-name or slug as name).",
    )
    parser.add_argument("--first-name", default=None, help="Optional given name.")
    parser.add_argument("--last-name", default=None, help="Optional family name.")
    args = parser.parse_args()
    fn = args.first_name.strip() if args.first_name else None
    ln = args.last_name.strip() if args.last_name else None
    asyncio.run(
        _run(
            email=args.email,
            password=args.password,
            tenant_slug=args.tenant_slug,
            tenant_name=args.tenant_name,
            new_tenant=args.create_tenant,
            first_name=fn or None,
            last_name=ln or None,
        )
    )


if __name__ == "__main__":
    main()
