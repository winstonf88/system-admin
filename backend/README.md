# Backend (FastAPI)

## Setup

Use [uv](https://docs.astral.sh/uv/) (recommended):

```bash
cd backend
uv sync --extra dev
cp .env.example .env
```

Run Python tools through the project environment with `uv run`, for example `uv run pytest`, `uv run uvicorn app.main:app --reload`, and `uv run api-shell` (see **Interactive shell** below).

## Interactive shell (Django shell_plus–style)

With dev extras, opens IPython with async session factory and models from `app.models` pre-imported.

**Commands** (from `backend/` after `uv sync --extra dev`):

```bash
uv run python -m app.scripts.shell
```

```bash
uv run api-shell
```

Requires `DATABASE_URL` (or defaults in Settings) and a reachable database. A **sync** ORM `session` is opened for queries without `await`, e.g. `session.execute(select(User).limit(5)).scalars().all()`. For the same patterns as the app, use top-level `await` with `SessionLocal` (e.g. `async with SessionLocal() as s: ...`).

## Configuration

Environment settings are loaded from `.env` via `pydantic-settings`.

Key variables:
- `APP_ENV`: `local`, `staging`, `production`, `test`
- `APP_DEBUG`: enables FastAPI debug mode
- `APP_CORS_ORIGINS`: comma-separated origins
- `DATABASE_URL`: SQLAlchemy URL (`postgresql+asyncpg://...`)
- `DB_POOL_*`: connection pool tuning

## Tests

```bash
cd backend
uv sync --extra dev
uv run pytest
```

Test layout mirrors [`app/`](app/): e.g. [`app/routers/categories.py`](app/routers/categories.py) ↔ [`tests/app/routers/test_categories.py`](tests/app/routers/test_categories.py). Factory Boy factories mirror [`app/models/`](app/models/) under [`tests/app/models/factories/`](tests/app/models/factories/) (e.g. [`tests/app/models/factories/category.py`](tests/app/models/factories/category.py) for [`app/models/category.py`](app/models/category.py)); re-exports live in [`tests/app/models/factories/__init__.py`](tests/app/models/factories/__init__.py).

## Database migrations

Migrations are managed with [Alembic](https://alembic.sqlalchemy.org/) and live in `migrations/versions/`. The env is async-aware and reads `DATABASE_URL` from your `.env` automatically — no credentials in `alembic.ini`.

### Status

```bash
# Show the revision(s) currently applied to the database
uv run alembic current

# List all revisions oldest → newest with details
uv run alembic history --verbose

# Show pending migrations (not yet applied)
uv run alembic history --indicate-current
```

### Applying migrations

```bash
# Apply all pending migrations
uv run alembic upgrade head

# Apply up to a specific revision
uv run alembic upgrade <revision>

# Apply the next N revisions
uv run alembic upgrade +2
```

### Rolling back

```bash
# Roll back the most recent migration
uv run alembic downgrade -1

# Roll back N steps
uv run alembic downgrade -3

# Roll back to a specific revision
uv run alembic downgrade <revision>

# Roll back everything (empty database)
uv run alembic downgrade base
```

### Creating a migration

After changing a SQLAlchemy model, autogenerate a migration:

```bash
uv run alembic revision --autogenerate -m "describe_your_change"
```

The file is written to `migrations/versions/`. **Always review it** before applying — Alembic cannot detect every change (e.g. renamed columns, custom types, check constraints, computed defaults).

Then apply:

```bash
uv run alembic upgrade head
```

### Writing a manual migration

For changes Alembic cannot detect (data migrations, custom DDL, etc.):

```bash
uv run alembic revision -m "backfill_tenant_slugs"
# edit the generated file, then:
uv run alembic upgrade head
```

### Generating SQL without connecting (offline mode)

Useful for reviewing or applying migrations in CI/CD without a live database:

```bash
# Print SQL for all pending migrations
uv run alembic upgrade head --sql

# Print SQL for a specific range
uv run alembic upgrade <from_rev>:<to_rev> --sql > migration.sql
```

### Stamp (mark without running)

Tells Alembic the database is already at a revision without executing any SQL — useful when the schema was created outside of Alembic:

```bash
uv run alembic stamp head
uv run alembic stamp <revision>
```

### Merge divergent branches

If two migration chains have diverged (e.g. from parallel feature branches):

```bash
uv run alembic merge -m "merge_feature_branches" <rev1> <rev2>
uv run alembic upgrade head
```

### File layout

```
backend/
├── alembic.ini               # Alembic config (no credentials)
└── migrations/
    ├── env.py                # Async env; imports all models for autogenerate
    ├── script.py.mako        # Migration file template
    └── versions/
        └── <rev>_<label>.py  # One file per migration
```

## Run (development)

From `backend/`:

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open http://localhost:8000/docs for the interactive API docs.

## Product & Category API

The backend includes CRUD APIs for categories, subcategories, products, product variations, and product file uploads.

- `POST /api/categories`
- `GET /api/categories`
- `GET /api/categories/tree` (nested category/subcategory tree)
- `GET /api/categories/{category_id}`
- `PUT /api/categories/{category_id}`
- `DELETE /api/categories/{category_id}`

- `POST /api/products`
- `GET /api/products`
- `GET /api/products/{product_id}`
- `PUT /api/products/{product_id}`
- `DELETE /api/products/{product_id}`
- `POST /api/products/{product_id}/upload` (multipart file upload)

Product variation payload example:

```json
{
  "name": "T-Shirt",
  "description": "Soft cotton shirt",
  "category_id": 1,
  "variations": [
    { "size": "M", "color": "Black", "quantity": 10 },
    { "size": "L", "color": "Black", "quantity": 8 },
    { "size": "M", "color": "White", "quantity": 6 }
  ]
}
```

## Run (production-like)

```bash
APP_ENV=production APP_EXPOSE_DOCS=false uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Bootstrap user

With the database reachable and migrations applied (`uv run alembic upgrade head`):

```bash
uv run python -m app.scripts.create_user --email you@example.com --password '...' --tenant-slug default --create-tenant
```
