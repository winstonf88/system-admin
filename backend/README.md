# Backend (FastAPI)

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
cp .env.example .env
```

## Configuration

Environment settings are loaded from `.env` via `pydantic-settings`.

Key variables:
- `APP_ENV`: `local`, `staging`, `production`, `test`
- `APP_DEBUG`: enables FastAPI debug mode
- `APP_CORS_ORIGINS`: comma-separated origins
- `DATABASE_URL`: SQLAlchemy URL (`postgresql+asyncpg://...`)
- `DB_POOL_*`: connection pool tuning

## Run (development)

From `backend/` with the virtualenv active:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
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
APP_ENV=production APP_EXPOSE_DOCS=false uvicorn app.main:app --host 0.0.0.0 --port 8000
```
