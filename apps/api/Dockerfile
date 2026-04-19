FROM oven/bun:1.3-alpine
WORKDIR /app

# Copy everything (workspace needs all package.json files)
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

RUN bun install

COPY packages/db/src packages/db/src
COPY packages/db/drizzle packages/db/drizzle
COPY packages/db/data packages/db/data
COPY packages/db/package.json packages/db/package.json
COPY packages/db/drizzle.config.ts packages/db/drizzle.config.ts
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY tsconfig.base.json .

EXPOSE 3001
ENV NODE_ENV=production
CMD ["bun", "run", "apps/api/src/index.ts"]
