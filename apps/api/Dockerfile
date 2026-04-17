FROM oven/bun:1.3-alpine AS base
WORKDIR /app

# Install deps
FROM base AS deps
COPY package.json bun.lock* ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile --production

# Build
FROM base AS runner
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/db packages/db
COPY packages/shared packages/shared
COPY apps/api apps/api

EXPOSE 3001
ENV NODE_ENV=production
CMD ["bun", "run", "apps/api/src/index.ts"]
