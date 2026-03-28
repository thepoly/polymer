import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "one_liner" varchar;
    ALTER TABLE "_users_v" ADD COLUMN IF NOT EXISTS "version_one_liner" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "one_liner";
    ALTER TABLE "_users_v" DROP COLUMN IF EXISTS "version_one_liner";
  `)
}
