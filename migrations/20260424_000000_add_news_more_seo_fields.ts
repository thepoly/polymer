import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "seo" ADD COLUMN IF NOT EXISTS "pages_news_more_title" varchar;
    ALTER TABLE "seo" ADD COLUMN IF NOT EXISTS "pages_news_more_description" varchar;
    ALTER TABLE "_seo_v" ADD COLUMN IF NOT EXISTS "version_pages_news_more_title" varchar;
    ALTER TABLE "_seo_v" ADD COLUMN IF NOT EXISTS "version_pages_news_more_description" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "seo" DROP COLUMN IF EXISTS "pages_news_more_title";
    ALTER TABLE "seo" DROP COLUMN IF EXISTS "pages_news_more_description";
    ALTER TABLE "_seo_v" DROP COLUMN IF EXISTS "version_pages_news_more_title";
    ALTER TABLE "_seo_v" DROP COLUMN IF EXISTS "version_pages_news_more_description";
  `)
}
