import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "section_layouts" jsonb;
    ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "volume" numeric;
    ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "edition" numeric;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "section" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "layout" DROP COLUMN IF EXISTS "section_layouts";
    ALTER TABLE "layout" DROP COLUMN IF EXISTS "volume";
    ALTER TABLE "layout" DROP COLUMN IF EXISTS "edition";
    ALTER TABLE "users" DROP COLUMN IF EXISTS "section";
  `)
}
