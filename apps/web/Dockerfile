FROM oven/bun:1.3-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

RUN bun install

FROM oven/bun:1.3-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/shared packages/shared
COPY apps/web apps/web
COPY tsconfig.base.json .
COPY package.json .

ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* vars are inlined into the client bundle at BUILD time, so the
# public API URL must be provided here as a build arg — a runtime env in
# docker-compose does NOT reach the browser. Defaults to localhost for local
# image builds; CI passes the prod value (e.g. https://gojolearn.ru/api).
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# Same build-time-inlining rule applies to the client-side Sentry DSN.
ARG NEXT_PUBLIC_SENTRY_DSN=""
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
RUN cd apps/web && bun run build

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production
CMD ["sh", "-c", "cd apps/web && bun run start"]
