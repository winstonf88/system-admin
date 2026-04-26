# Deployment

Deploys to DigitalOcean App Platform. App Platform builds images from source, handles TLS, and manages routing. No droplet or Caddy required.

## Services

| Service | Source | Port |
|---|---|---|
| `api` | `backend/` (Dockerfile) | 8000 (internal) |
| `web` | `frontend/` (Dockerfile) | 3000 (internal) |

The `api` service is publicly reachable at `/` (all routes). The `web` service is also at `/`. App Platform routes by service — assign each service its own custom domain in the console.

## How deploys work

Pushing a tag triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`):

1. Pushes `app.yaml` to App Platform via `doctl apps update`
2. App Platform builds both images from source and deploys them
3. The `api` service runs `aerich upgrade` before starting uvicorn (see `run_command` in `app.yaml`)

To deploy:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

## One-time App Platform setup

### 1. Create the app

```bash
doctl auth init
doctl apps create --spec app.yaml
```

Note the app ID from the output (or `doctl apps list`).

### 2. Set secret environment variables

In the App Platform console under the app → **Settings → Environment Variables**, set the following as encrypted secrets for the `api` service:

- `DATABASE_URL`
- `SECRET_KEY`
- `APP_CORS_ORIGINS` — comma-separated list of allowed frontend origins
- `SPACES_KEY`
- `SPACES_SECRET`
- `SPACES_BUCKET`
- `SPACES_CDN_ENDPOINT`

### 3. Configure the custom domain

In the console, go to **Settings → Domains** for each service and add your domain. App Platform provisions TLS automatically.

## GitHub Actions secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `DIGITALOCEAN_ACCESS_TOKEN` | DO personal access token (app platform + registry scopes) |
| `APP_PLATFORM_APP_ID` | App ID from `doctl apps list` |

## Database

Managed by DigitalOcean Managed Database (PostgreSQL). Connection string goes in `.env.site-admin-api` as:

```
DATABASE_URL=postgresql+asyncpg://user:password@host:25060/dbname?ssl=require
```

Get the connection details from the DigitalOcean console under **Databases**.

## Storage

Files are stored in DigitalOcean Spaces. Configure in `.env.site-admin-api`:

```
STORAGE_BACKEND=spaces
SPACES_KEY=...
SPACES_SECRET=...
SPACES_REGION=nyc3
SPACES_BUCKET=...
SPACES_CDN_ENDPOINT=https://your-bucket.nyc3.cdn.digitaloceanspaces.com
```

## Domain

Update `Caddyfile` with the real domain once available, then restart Caddy — it will automatically provision a TLS certificate via Let's Encrypt.
