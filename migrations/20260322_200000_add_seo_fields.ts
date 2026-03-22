import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "seo_title" varchar;
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "search_description" varchar;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_seo_title" varchar;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_search_description" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "seo_title";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "search_description";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_seo_title";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_search_description";
  `)
}
