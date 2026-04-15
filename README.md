# Gojo USM

Monorepo: Next.js + Hono + Drizzle + Postgres 18 + Redis + LiveKit.

## Structure

```
apps/
  web/      Next.js 15 (App Router, React 19)
  api/      Hono on Bun
packages/
  db/       Drizzle schema + client (@gojo/db)
infra/
  docker-compose.yml   Postgres 18, Redis, Minio, LiveKit
```

## Quick start

```sh
cp .env.example .env
bun install
bun run infra:up
bun run db:generate
bun run db:migrate
bun run dev
```

- Web: http://localhost:3000
- API: http://localhost:3001/health
- Minio console: http://localhost:9001 (minioadmin / minioadmin)
- LiveKit: ws://localhost:7880

## Scripts

- `bun run dev` — run web + api in parallel
- `bun run db:generate` — generate SQL migrations from schema
- `bun run db:migrate` — apply migrations
- `bun run db:studio` — Drizzle Studio
- `bun run infra:up` / `infra:down` — docker stack
- `bun run lint` / `format` — Biome
