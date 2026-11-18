#!/usr/bin/env bash
# Bring up the local dev DB and apply pending migrations before starting Next.js.
#
# Behavior:
# - If .env's DATABASE_URL points at the docker-compose DB (port 5433), start
#   the compose container and run migrations.
# - If DATABASE_URL points elsewhere (e.g. a system Postgres on 5432), skip
#   docker entirely and just run migrations against that DB.
# - If .env is missing, fall back to docker-compose. (postinstall normally
#   writes one, so this is rare.)
#
# Idempotent — safe to run on every `pnpm dev`.
set -euo pipefail

# Pull DATABASE_URL out of .env without sourcing (so we don't leak unrelated
# variables into the rest of the script).
DB_URL=""
if [ -f .env ]; then
  DB_URL=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- || true)
fi

NEEDS_DOCKER=0
if [ -z "$DB_URL" ]; then
  NEEDS_DOCKER=1
elif echo "$DB_URL" | grep -qE '(127\.0\.0\.1|localhost):5433/'; then
  NEEDS_DOCKER=1
fi

if [ "$NEEDS_DOCKER" = "1" ]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "docker is required for the local dev db. Install Docker or override DATABASE_URL in .env." >&2
    exit 1
  fi

  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    echo "docker compose not found. Install the Compose plugin." >&2
    exit 1
  fi

  echo "[dev-up] starting polymer-dev-db (docker compose)..."
  "${COMPOSE[@]}" up -d --wait db
fi

echo "[dev-up] applying any pending payload migrations..."
echo "y" | pnpm exec payload migrate

# Migrations are the source of truth for schema. With push left on, Payload
# reconciles the migrated DB against the collection config on boot, which
# drops tables migrations still create (e.g. the retired audio_* tables) and
# can crash or leave the DB half-changed. generate-env.js sets this for new
# .env files; older or hand-written ones may be missing it.
PUSH_FLAG="${PAYLOAD_DISABLE_PUSH:-}"
if [ -z "$PUSH_FLAG" ] && [ -f .env ]; then
  PUSH_FLAG=$(grep -E '^PAYLOAD_DISABLE_PUSH=' .env | head -1 | cut -d= -f2- || true)
fi
if [ "$PUSH_FLAG" != "1" ]; then
  echo "[dev-up] WARNING: PAYLOAD_DISABLE_PUSH=1 is not set in .env." >&2
  echo "[dev-up] Payload's dev schema push will run and can drop tables the migrations created." >&2
  echo "[dev-up] Add PAYLOAD_DISABLE_PUSH=1 to .env. See docs/local-development.md." >&2
fi
