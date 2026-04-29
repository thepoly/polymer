# Migrations

**Read this before changing the database schema.** Polymer uses two
migration paths and you have to update **both** or production will break.

## Why two paths?

CI runs `pnpm exec payload migrate` against a fresh ephemeral Postgres
container. That uses the TypeScript migrations registered in
[`migrations/index.ts`](../migrations/index.ts) — Payload's standard flow.

Production, however, runs raw SQL via
[`scripts/run_deploy_sql_migrations.sh`](../scripts/run_deploy_sql_migrations.sh)
and writes a row into `payload_migrations` for each one so Payload
considers them "applied." This keeps deploys idempotent and lets us hand-
roll DDL when the auto-generated SQL is wrong or risky.

If you only update one path:

- **TS only**: CI passes, then production deploy boots a binary expecting
  schema that the prod DB doesn't have. Site crashes on first request to
  the affected collection.
- **SQL only**: production works, but CI fails because Payload's
  schema-vs-config check fails inside `pnpm exec payload migrate`.

So: every schema change touches **both** files.

## Step-by-step: adding a field

1. **Edit the collection** in `collections/<Name>.ts`. Run `pnpm
   generate:types` so `payload-types.ts` reflects the new field.

2. **Generate the Payload migration**:

   ```bash
   pnpm exec payload migrate:create add_my_field
   ```

   This creates two files in `migrations/`:
   `<timestamp>_add_my_field.ts` and `<timestamp>_add_my_field.json`.

3. **Verify the generated SQL** in the `.ts` file's `up` and `down`
   functions. Pay attention to:
   - `NOT NULL` columns on existing tables — you almost always need a
     `DEFAULT` or a backfill, otherwise the migration fails on real data.
   - Enum changes — Postgres can't drop enum values, so plan ahead.
   - Foreign keys — make sure the referenced table exists.

4. **Register it** in `migrations/index.ts`:

   ```ts
   import * as migration_<timestamp>_add_my_field from './<timestamp>_add_my_field';

   export const migrations = [
     // ...
     {
       up: migration_<timestamp>_add_my_field.up,
       down: migration_<timestamp>_add_my_field.down,
       name: '<timestamp>_add_my_field',
     },
   ];
   ```

5. **Mirror it in SQL** at the bottom of `scripts/run_deploy_sql_migrations.sh`:

   ```sql
   -- <timestamp>: add my_field to my_table
   ALTER TABLE "my_table"
     ADD COLUMN IF NOT EXISTS "my_field" varchar;
   ```

   Use the `IF NOT EXISTS` / `DO $$ … EXCEPTION WHEN duplicate_object`
   patterns already in the file. The script must be re-runnable.

6. **Add the tracking row** at the top of the same file, in the
   `INSERT INTO payload_migrations` block:

   ```sql
   ('<timestamp>_add_my_field', <batch>, NOW(), NOW()),
   ```

   Pick the next sensible `batch` number (see existing entries for the
   convention — usually one batch per "logical group" of migrations).

7. **Run it locally** to make sure the SQL actually works against your dev DB:

   ```bash
   PAYLOAD_DISABLE_PUSH=1 pnpm exec payload migrate
   # ...or replay the prod path:
   psql "$DATABASE_URL" -f scripts/run_deploy_sql_migrations.sh
   ```

8. **Commit**: collection edit + migration files + `migrations/index.ts` +
   `run_deploy_sql_migrations.sh` + regenerated `payload-types.ts`.

## Rules of thumb

- **One change per migration.** Easier to revert, easier to review.
- **Backfills go in the same migration as the schema change.** A
  separate "fix the data later" migration is how production crashes.
  See `20260409_000000_backfill_plain_title.ts` for a working pattern.
- **Make new columns nullable or defaulted.** A `NOT NULL` add without a
  default fails the moment Payload tries it on a non-empty table.
- **Don't reuse a migration filename.** `payload_migrations` is keyed on
  the file name; if you rename, both CI and prod will think it's a new
  migration and try to run it twice.
- **Test your `down`.** If you ever need to roll back, the script will
  run it. Don't leave it as `// TODO`.

## Reading the existing migrations

Looking through `migrations/` in date order is the fastest way to learn
what conventions the codebase has settled on. A few canonical examples:

- Adding a column with a default: `20260322_231000_add_user_retired.ts`
- Adding a new collection (table + relation FKs): `20260424_020000_add_device_tokens.ts`
- Adding a new global: `20260401_010000_add_seo_global.ts`
- Adding an enum value (sometimes generated, sometimes manual SQL): `20260322_220000_add_more_to_opinion_type_enum.ts`
- Backfill / data migration: `20260409_000000_backfill_plain_title.ts`
- Versioned-doc gymnastics (shadow `_v` tables): `20260423_000000_layout_versions_and_remove_edition.ts`

## Where production actually runs them

`.github/workflows/deploy.yml` invokes
`scripts/run_deploy_sql_migrations.sh` after `pnpm install --frozen-lockfile`
and **before** `pnpm run build`. The script reads `DATABASE_URL` from the
environment (which is sourced from `/var/www/polymer/shared/.env`) and
applies the SQL file in a single `psql` heredoc.

If a migration fails at this step:

- the deploy aborts before the symlink switch
- the previous release stays live and untouched
- the runner's logs will show the failing SQL — fix the migration on a
  branch, push to `main`, and let CI/deploy retry
