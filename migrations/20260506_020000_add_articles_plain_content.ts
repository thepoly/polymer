import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add `plain_content` to `articles` (+ version shadow) so the search adapter
 * can match body text. Populated by the `Articles.beforeChange` hook from the
 * Lexical content document. Backfilled for legacy rows by the import scripts'
 * `--update` mode.
 *
 * No NOT NULL — leave nullable so existing rows that haven't been re-saved
 * yet keep working until backfill completes.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "plain_content" text;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_plain_content" text;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_plain_content";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "plain_content";
  `)
}
