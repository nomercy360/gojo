# Gojo Learn

Школа японского языка нового поколения. Монорепо: Next.js + Hono + Drizzle + Postgres + LiveKit + better-auth.

## Стек

- **Web**: Next.js 15 (App Router, React 19, Tailwind v4)
- **API**: Hono on Bun
- **DB**: PostgreSQL 18 + pgvector
- **Auth**: better-auth (email/password, sessions, OAuth-ready)
- **Video**: LiveKit self-hosted
- **Storage**: S3-compatible (Minio локально / R2 в проде)
- **DevOps**: Docker Compose, Caddy, GitHub Actions

## Структура

```
apps/
  web/              Next.js frontend
  api/              Hono API (better-auth, lessons, rooms, teacher)
packages/
  db/               Drizzle schema + migrations
  shared/           Zod DTOs shared between API and web
infra/
  docker-compose.yml          Dev stack (Postgres, Redis, Minio, Mailpit, LiveKit)
  docker-compose.prod.yml     Prod stack (with pulled images + Caddy)
  Caddyfile
.github/workflows/
  deploy.yml        CI: build & push to GHCR + SSH deploy to VM
```

## Dev

```sh
cp .env.example .env
bun install
bun run infra:up          # Postgres + Redis + Minio + Mailpit + LiveKit
bun run db:migrate
bun run --cwd packages/db seed
bun run dev               # web :3000 + api :3001
```

## Deploy (auto via GitHub Actions)

Push to `main` → workflow builds Docker images → pushes to GHCR → SSH's to VM → pulls & restarts.

### Required GitHub Secrets

- `SSH_HOST` — VM IP
- `SSH_USER` — typically `root`
- `SSH_PRIVATE_KEY` — private SSH key for the VM
