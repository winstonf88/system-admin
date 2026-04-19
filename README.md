# system-admin

Monorepo with a **FastAPI** backend and **Next.js** frontend.

## Prerequisites

- Python 3.11+
- Node.js 20+ and npm

## Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000
- OpenAPI docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## Frontend (Next.js)

```bash
cd frontend
cp .env.local.example .env.local   # optional; set API URL for browser calls
npm install   # already run if you just scaffolded
npm run dev
```

- App: http://localhost:3000

The API allows CORS from `http://localhost:3000` during local development. Point `NEXT_PUBLIC_API_URL` at the FastAPI origin when you call the API from the browser.

## Repository layout

- `backend/` — FastAPI application (`app.main:app`)
- `frontend/` — Next.js App Router application
