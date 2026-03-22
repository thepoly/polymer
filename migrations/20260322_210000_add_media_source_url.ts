import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "source_url" varchar;

    UPDATE "media"
    SET "source_url" = "url"
    WHERE "url" LIKE 'http://10.10.10.22:8080/media/%'
      AND ("source_url" IS NULL OR "source_url" = '');
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" DROP COLUMN IF EXISTS "source_url";
  `)
}
