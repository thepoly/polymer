import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "theme"
      ADD COLUMN IF NOT EXISTS "header_animation_enabled" boolean DEFAULT true;

    ALTER TABLE "_theme_v"
      ADD COLUMN IF NOT EXISTS "version_header_animation_enabled" boolean DEFAULT true;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "theme"
      DROP COLUMN IF EXISTS "header_animation_enabled";

    ALTER TABLE "_theme_v"
      DROP COLUMN IF EXISTS "version_header_animation_enabled";
  `)
}
