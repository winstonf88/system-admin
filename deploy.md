# Deployment

Deploys to a single DigitalOcean droplet running Docker. Caddy handles TLS and reverse proxying. Images are stored in DigitalOcean Container Registry.

## Services

| Service | Image | Port |
|---|---|---|
| `caddy` | `caddy:2-alpine` | 80, 443 |
| `site-admin-api` | `registry.digitalocean.com/site-admin/backend` | 8000 (internal) |
| `site-admin-web` | `registry.digitalocean.com/site-admin/frontend` | 3000 (internal) |

## How deploys work

Pushing a tag triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`):

1. Builds and pushes both Docker images to `registry.digitalocean.com/site-admin`
2. SSHs into the droplet
3. Pulls new images
4. Runs `aerich upgrade` to apply any pending database migrations
5. Restarts containers with `docker compose up -d`

To deploy:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

## One-time droplet setup

### 1. Install dependencies

```bash
apt update && apt install -y docker.io
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
```

### 2. Install doctl

```bash
cd /tmp
curl -sL https://github.com/digitalocean/doctl/releases/latest/download/doctl-$(curl -s https://api.github.com/repos/digitalocean/doctl/releases/latest | grep tag_name | cut -d '"' -f4 | tr -d v)-linux-amd64.tar.gz | tar xz
mv doctl /usr/local/bin
```

### 3. Create the app directory

```bash
mkdir -p /app
```

Copy `docker-compose.yml` and `Caddyfile` to `/app`.

### 4. Configure environment

```bash
cp .env.production.example /app/.env.site-admin-api
chmod 600 /app/.env.site-admin-api
```

Edit `/app/.env.site-admin-api` and fill in all values (database URL, Spaces credentials, secret key).

### 5. Add SSH deploy key

Generate a keypair on your local machine:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/site-admin-deploy -C "site-admin-deploy"
```

Add the public key to the droplet:

```bash
cat ~/.ssh/site-admin-deploy.pub | ssh root@<droplet-ip> "cat >> ~/.ssh/authorized_keys"
```

## GitHub Actions secrets

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `DIGITALOCEAN_ACCESS_TOKEN` | DO personal access token (registry read/write scope) |
| `DROPLET_HOST` | Droplet IP address |
| `DROPLET_SSH_KEY` | Contents of `~/.ssh/site-admin-deploy` (private key) |

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
