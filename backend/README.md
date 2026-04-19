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

## Run (production-like)

```bash
APP_ENV=production APP_EXPOSE_DOCS=false uvicorn app.main:app --host 0.0.0.0 --port 8000
```
