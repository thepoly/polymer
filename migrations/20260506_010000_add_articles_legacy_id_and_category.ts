import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add `legacy_article_id` (indexed) and `legacy_category` to `articles` (and
 * the version shadow `_articles_v`). Both nullable. The legacy import scripts
 * use (legacy_source, legacy_article_id) as the idempotent upsert key.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "legacy_article_id" varchar;
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "legacy_category" varchar;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_legacy_article_id" varchar;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_legacy_category" varchar;
    CREATE INDEX IF NOT EXISTS "articles_legacy_article_id_idx" ON "articles" ("legacy_article_id");
    CREATE INDEX IF NOT EXISTS "articles_legacy_source_legacy_article_id_idx" ON "articles" ("legacy_source", "legacy_article_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "articles_legacy_source_legacy_article_id_idx";
    DROP INDEX IF EXISTS "articles_legacy_article_id_idx";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_legacy_category";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_legacy_article_id";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "legacy_category";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "legacy_article_id";
  `)
}
