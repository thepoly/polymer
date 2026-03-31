import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "is_photofeature" boolean DEFAULT false;
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "gradient_opacity" numeric;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_is_photofeature" boolean DEFAULT false;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_gradient_opacity" numeric;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "is_photofeature";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "gradient_opacity";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_is_photofeature";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_gradient_opacity";
  `)
}
