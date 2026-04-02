#!/bin/bash
set -e
psql -U postgres -c "DROP DATABASE IF EXISTS polymer_ci_test2;"
createdb -U postgres polymer_ci_test2
export PAYLOAD_SECRET=ci-secret
export DATABASE_URL=postgres://postgres@127.0.0.1:5432/polymer_ci_test2
export LEGACY_DATABASE_URI=postgres://postgres@127.0.0.1:5432/polymer_ci_test2
export NEXT_PUBLIC_SITE_URL=https://poly.rpi.edu
export BASE_URL=http://127.0.0.1:3000
export PLAYWRIGHT_WEB_SERVER_COMMAND="pnpm start"
export CI=true

pnpm exec payload migrate
pnpm build
