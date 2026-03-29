import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "is_follytechnic" boolean DEFAULT false;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_is_follytechnic" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "is_follytechnic";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_is_follytechnic";
  `)
}
