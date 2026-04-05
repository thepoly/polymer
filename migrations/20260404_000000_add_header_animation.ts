import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "theme"
      ADD COLUMN IF NOT EXISTS "header_animation_wave_color1" varchar,
      ADD COLUMN IF NOT EXISTS "header_animation_wave_color2" varchar,
      ADD COLUMN IF NOT EXISTS "header_animation_wave_color3" varchar,
      ADD COLUMN IF NOT EXISTS "header_animation_wave_count" numeric,
      ADD COLUMN IF NOT EXISTS "header_animation_line_weight" numeric,
      ADD COLUMN IF NOT EXISTS "header_animation_wrap_around" boolean;

    ALTER TABLE "_theme_v"
      ADD COLUMN IF NOT EXISTS "version_header_animation_wave_color1" varchar,
      ADD COLUMN IF NOT EXISTS "version_header_animation_wave_color2" varchar,
      ADD COLUMN IF NOT EXISTS "version_header_animation_wave_color3" varchar,
      ADD COLUMN IF NOT EXISTS "version_header_animation_wave_count" numeric,
      ADD COLUMN IF NOT EXISTS "version_header_animation_line_weight" numeric,
      ADD COLUMN IF NOT EXISTS "version_header_animation_wrap_around" boolean;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "theme"
      DROP COLUMN IF EXISTS "header_animation_wave_color1",
      DROP COLUMN IF EXISTS "header_animation_wave_color2",
      DROP COLUMN IF EXISTS "header_animation_wave_color3",
      DROP COLUMN IF EXISTS "header_animation_wave_count",
      DROP COLUMN IF EXISTS "header_animation_line_weight",
      DROP COLUMN IF EXISTS "header_animation_wrap_around";

    ALTER TABLE "_theme_v"
      DROP COLUMN IF EXISTS "version_header_animation_wave_color1",
      DROP COLUMN IF EXISTS "version_header_animation_wave_color2",
      DROP COLUMN IF EXISTS "version_header_animation_wave_color3",
      DROP COLUMN IF EXISTS "version_header_animation_wave_count",
      DROP COLUMN IF EXISTS "version_header_animation_line_weight",
      DROP COLUMN IF EXISTS "version_header_animation_wrap_around";
  `)
}
