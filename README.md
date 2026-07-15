# Gojo Learn

Школа японского языка нового поколения. Монорепо: Next.js + Hono + Drizzle + Postgres + better-auth.

## Стек

- **Web**: Next.js 15 (App Router, React 19, Tailwind v4)
- **API**: Hono on Bun
- **DB**: PostgreSQL 18 + pgvector
- **Auth**: passwordless email/Telegram codes with better-auth sessions
- **Video**: внешние ссылки (Zoom/Meet) на уроке
- **Storage**: S3-compatible (Minio локально / R2 в проде)
- **DevOps**: Docker Compose, Caddy, GitHub Actions

## Структура

```
apps/
  web/              Next.js frontend
  api/              Hono API (better-auth, lessons, teacher)
packages/
  db/               Drizzle schema + migrations
  shared/           Zod DTOs shared between API and web
infra/
  docker-compose.yml          Dev stack (Postgres, Minio, Mailpit)
  docker-compose.prod.yml     Prod stack (with pulled images + Caddy)
  Caddyfile
.github/workflows/
  deploy.yml        CI: build & push to GHCR + SSH deploy to VM
```

## Dev

```sh
cp .env.example .env
bun install
bun run infra:up          # Postgres + Minio + Mailpit
bun run db:migrate
bun run dev               # seeds local users, then starts web :3000 + api :3001
```

Local logins:

- Admin: `admin.test@gojolearn.ru` / `AdminTest123-`
- Student: `student.test@gojolearn.ru` / `StudentTest123-`

## E2E tests

The Playwright suite starts the API and web development servers, provisions isolated student and
admin browser sessions through the development login endpoint, and runs in Chromium. Postgres must
be available locally; the standard development infrastructure provides it.

Coverage includes public and protected-route smoke tests, role routing, real form login, booking
capacity enforcement, and a connected learning journey from lesson creation and booking through
attendance, card materialization, homework submission, and teacher approval. Mutating scenarios use
unique lessons and remove their database records in teardown.

Additional coverage includes onboarding persistence, profile editing, password-reset delivery via
Mailpit, public leads and account linking, personal-event ownership, training totals, payment access
boundaries, and lesson-material authorization. The suite runs with one worker because it exercises a
shared integration database.

```sh
bun run infra:up
bunx playwright install chromium  # first run only
bun run test:e2e
```

Use `bun run test:e2e:headed` to watch the browser, `bun run test:e2e:ui` for Playwright UI mode,
and `E2E_EXTERNAL_SERVERS=1` with `E2E_WEB_URL`/`E2E_API_URL` to target servers managed elsewhere.

## Deploy (auto via GitHub Actions)

Push to `main` → workflow builds Docker images → pushes to GHCR → SSH's to VM → pulls & restarts.

### Required GitHub Secrets

- `SSH_HOST` — VM IP
- `SSH_USER` — typically `root`
- `SSH_PRIVATE_KEY` — private SSH key for the VM
