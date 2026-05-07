import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add `previous_slug` to `articles` (+ version shadow). When a slug is
 * renamed (e.g. legacy slug-cleanup), set `previous_slug` to the old value
 * so the request middleware can issue a 301 redirect to the new URL.
 *
 * Single-string for now (one historical slug per article). If we ever need
 * multiple aliases we can swap to a text[].
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "previous_slug" varchar;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_previous_slug" varchar;
    CREATE INDEX IF NOT EXISTS "articles_previous_slug_idx" ON "articles" ("previous_slug");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "articles_previous_slug_idx";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_previous_slug";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "previous_slug";
  `)
}
