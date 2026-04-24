import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add `breaking_news` boolean column to `articles` (and its version shadow
 * table `_articles_v`). Flags an article for a push notification when it
 * transitions to published.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "breaking_news" boolean DEFAULT false NOT NULL;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_breaking_news" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "breaking_news";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_breaking_news";
  `)
}
