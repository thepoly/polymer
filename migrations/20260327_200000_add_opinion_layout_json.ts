import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "opinion_page_layout" ADD COLUMN IF NOT EXISTS "layout" jsonb;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "opinion_page_layout" DROP COLUMN IF EXISTS "layout";
  `)
}
