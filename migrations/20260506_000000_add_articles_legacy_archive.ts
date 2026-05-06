import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add `legacy_html_url` and `legacy_source` columns to `articles` (and the
 * version shadow `_articles_v`). Both nullable. Populated by separate
 * legacy-import scripts; the article page shows an "original archive" link
 * when `legacy_html_url` is set.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "legacy_html_url" varchar;
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "legacy_source" varchar;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_legacy_html_url" varchar;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_legacy_source" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "legacy_html_url";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "legacy_source";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_legacy_html_url";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_legacy_source";
  `)
}
