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

With dev extras, opens IPython with models from `app.models` pre-imported and Tortoise ORM initialized.

**Commands** (from `backend/` after `uv sync --extra dev`):

```bash
uv run python -m app.scripts.shell
```

```bash
uv run api-shell
```

Requires `DATABASE_URL` (or defaults in Settings) and a reachable database. Use top-level `await` for queries, e.g. `await User.all().limit(5)`.

## Configuration

Environment settings are loaded from `.env` via `pydantic-settings`.

Key variables:
- `APP_ENV`: `local`, `staging`, `production`, `test`
- `APP_DEBUG`: enables FastAPI debug mode
- `APP_CORS_ORIGINS`: comma-separated origins
- `DATABASE_URL`: asyncpg URL (`postgresql+asyncpg://...`)

## Tests

```bash
cd backend
uv sync --extra dev
uv run pytest
```

Test layout mirrors [`app/`](app/): e.g. [`app/routers/categories.py`](app/routers/categories.py) ↔ [`tests/app/routers/test_categories.py`](tests/app/routers/test_categories.py). Factory Boy factories mirror [`app/models/`](app/models/) under [`tests/app/models/factories/`](tests/app/models/factories/) (e.g. [`tests/app/models/factories/category.py`](tests/app/models/factories/category.py) for [`app/models/category.py`](app/models/category.py)); re-exports live in [`tests/app/models/factories/__init__.py`](tests/app/models/factories/__init__.py).

## Database migrations

Migrations are managed with [aerich](https://github.com/tortoise/aerich) (the Tortoise ORM migration tool) and live in `migrations/`. Config is in `pyproject.toml` under `[tool.aerich]`.

### First-time setup

```bash
uv run aerich init-db
```

### Creating a migration

After changing a Tortoise model:

```bash
uv run aerich migrate --name "describe_your_change"
```

### Applying migrations

```bash
uv run aerich upgrade
# or via the project script alias:
uv run db-migrate upgrade
```

### Rolling back

```bash
uv run aerich downgrade
```

### History

```bash
uv run aerich history
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

With the database reachable and migrations applied (`uv run aerich upgrade`):

```bash
uv run python -m app.scripts.create_user --email you@example.com --password '...' --tenant-slug default --create-tenant
```
