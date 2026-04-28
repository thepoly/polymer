#!/usr/bin/env bash
# Spin up a throwaway Postgres in docker, run BOTH migration paths against it
# (the TS one used in CI + the SQL one used in production), optionally seed,
# and tear it down on exit. Used to verify schema changes won't break deploy.
set -euo pipefail

SEED=0
BOOT=0
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=1 ;;
    --boot) BOOT=1 ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

PORT=$(( ( RANDOM % 1000 ) + 55000 ))
NAME="polymer-migrate-test-$$"
URL="postgres://polymer:polymer@127.0.0.1:${PORT}/polymer_test"

cleanup() {
  if docker ps -a --format '{{.Names}}' | grep -q "^${NAME}$"; then
    echo "[migrate-test] removing $NAME"
    docker rm -f "$NAME" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo "[migrate-test] starting throwaway Postgres on :${PORT} as ${NAME}"
docker run --rm -d \
  --name "$NAME" \
  -e POSTGRES_USER=polymer \
  -e POSTGRES_PASSWORD=polymer \
  -e POSTGRES_DB=polymer_test \
  -p "${PORT}:5432" \
  postgres:16 >/dev/null

echo "[migrate-test] waiting for Postgres..."
for _ in $(seq 1 60); do
  if docker exec "$NAME" pg_isready -U polymer -d polymer_test >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

export DATABASE_URL="$URL"

# Payload's local API needs a secret to init. Pull from .env if present,
# otherwise synthesize one — the throwaway DB has no real auth state, so any
# nonzero value works.
if [ -z "${PAYLOAD_SECRET:-}" ]; then
  if [ -f .env ]; then
    PAYLOAD_SECRET=$(grep -E '^PAYLOAD_SECRET=' .env | head -1 | cut -d= -f2- || true)
  fi
  if [ -z "${PAYLOAD_SECRET:-}" ]; then
    PAYLOAD_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "migrate-test-secret")
  fi
fi
export PAYLOAD_SECRET

echo "[migrate-test] step 1/2: pnpm exec payload migrate (CI path)"
echo "y" | pnpm exec payload migrate

echo "[migrate-test] step 2/2: scripts/run_deploy_sql_migrations.sh (production path)"
# The SQL script is idempotent — it should be a no-op against an already-migrated DB.
# If it errors here, the deploy SQL has drifted from migrations/.
./scripts/run_deploy_sql_migrations.sh

if [ "$SEED" = "1" ]; then
  echo "[migrate-test] seeding..."
  pnpm exec tsx scripts/seed.ts
fi

if [ "$BOOT" = "1" ]; then
  echo "[migrate-test] booting next dev against $URL"
  echo "Ctrl+C to stop and tear down the container."
  pnpm exec next dev
else
  echo "[migrate-test] OK — both migration paths succeeded against a fresh DB."
fi
