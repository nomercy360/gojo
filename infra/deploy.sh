#!/bin/bash
set -euo pipefail

# Gojo Learn — one-command deploy
# Usage: ./deploy.sh [domain]
# Run from repo root on the VM.

DOMAIN="${1:-localhost}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== Gojo Learn deploy ==="
echo "Domain: $DOMAIN"
echo "Root:   $ROOT_DIR"

# Check docker
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER"
  echo "Docker installed. Re-run this script."
  exit 0
fi

# Create .env if missing
ENV_FILE="$SCRIPT_DIR/.env.prod"
if [ ! -f "$ENV_FILE" ]; then
  echo "Creating .env.prod from example..."
  cp "$SCRIPT_DIR/.env.prod.example" "$ENV_FILE"

  # Generate random secrets
  JWT_SECRET=$(openssl rand -hex 32)
  PG_PASSWORD=$(openssl rand -hex 16)
  S3_SECRET=$(openssl rand -hex 16)
  LK_SECRET=$(openssl rand -hex 24)

  sed -i "s|CHANGE_ME_strong_password_here|$PG_PASSWORD|" "$ENV_FILE"
  sed -i "s|CHANGE_ME_at_least_32_characters_random_string|$JWT_SECRET|" "$ENV_FILE"
  sed -i "s|gojo.example.com|$DOMAIN|g" "$ENV_FILE"
  # Fix S3 and LK secrets (second occurrence)
  sed -i "0,/S3_SECRET_KEY=.*/s|S3_SECRET_KEY=.*|S3_SECRET_KEY=$S3_SECRET|" "$ENV_FILE"
  sed -i "0,/LIVEKIT_API_SECRET=.*/s|LIVEKIT_API_SECRET=.*|LIVEKIT_API_SECRET=$LK_SECRET|" "$ENV_FILE"

  echo "Generated .env.prod with random secrets."
  echo "Review it: cat $ENV_FILE"
fi

# Export env vars
set -a
source "$ENV_FILE"
set +a

# Build and start
cd "$ROOT_DIR"
echo "Building containers..."
docker compose -f infra/docker-compose.prod.yml build

echo "Starting stack..."
docker compose -f infra/docker-compose.prod.yml up -d

# Wait for postgres
echo "Waiting for Postgres..."
until docker exec gojo-postgres pg_isready -U "${POSTGRES_USER:-gojo}" &>/dev/null; do
  sleep 1
done

# Run migrations
echo "Running migrations..."
docker exec gojo-api bun run /app/packages/db/src/migrate.ts

echo ""
echo "=== Deploy complete ==="
echo "Web:     https://$DOMAIN"
echo "API:     https://$DOMAIN/health"
echo "Minio:   internal only (port 9001 not exposed)"
echo ""
echo "Seed data: docker exec gojo-api bun run /app/packages/db/src/seed.ts"
echo "Logs:      docker compose -f infra/docker-compose.prod.yml logs -f"
