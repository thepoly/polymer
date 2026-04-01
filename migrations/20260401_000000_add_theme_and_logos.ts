import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Logos upload collection
    CREATE TABLE IF NOT EXISTS "logos" (
      "id" serial PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric
    );
    CREATE INDEX IF NOT EXISTS "logos_created_at_idx" ON "logos" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "logos_filename_idx" ON "logos" USING btree ("filename");

    -- Theme global
    CREATE TABLE IF NOT EXISTS "theme" (
      "id" serial PRIMARY KEY NOT NULL,
      "logos_desktop_light_id" integer,
      "logos_desktop_dark_id" integer,
      "logos_mobile_light_id" integer,
      "logos_mobile_dark_id" integer,
      "light_mode_background" varchar,
      "light_mode_foreground" varchar,
      "light_mode_foreground_muted" varchar,
      "light_mode_accent" varchar,
      "light_mode_border_color" varchar,
      "light_mode_rule_color" varchar,
      "light_mode_rule_strong_color" varchar,
      "light_mode_header_top_bg" varchar,
      "light_mode_header_top_text" varchar,
      "light_mode_header_nav_bg" varchar,
      "light_mode_header_nav_text" varchar,
      "light_mode_header_border" varchar,
      "dark_mode_background" varchar,
      "dark_mode_foreground" varchar,
      "dark_mode_foreground_muted" varchar,
      "dark_mode_accent" varchar,
      "dark_mode_border_color" varchar,
      "dark_mode_rule_color" varchar,
      "dark_mode_rule_strong_color" varchar,
      "dark_mode_header_top_bg" varchar,
      "dark_mode_header_top_text" varchar,
      "dark_mode_header_nav_bg" varchar,
      "dark_mode_header_nav_text" varchar,
      "dark_mode_header_border" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    -- Theme versions table (audit trail)
    CREATE TABLE IF NOT EXISTS "_theme_v" (
      "id" serial PRIMARY KEY NOT NULL,
      "parent_id" integer,
      "version_logos_desktop_light_id" integer,
      "version_logos_desktop_dark_id" integer,
      "version_logos_mobile_light_id" integer,
      "version_logos_mobile_dark_id" integer,
      "version_light_mode_background" varchar,
      "version_light_mode_foreground" varchar,
      "version_light_mode_foreground_muted" varchar,
      "version_light_mode_accent" varchar,
      "version_light_mode_border_color" varchar,
      "version_light_mode_rule_color" varchar,
      "version_light_mode_rule_strong_color" varchar,
      "version_light_mode_header_top_bg" varchar,
      "version_light_mode_header_top_text" varchar,
      "version_light_mode_header_nav_bg" varchar,
      "version_light_mode_header_nav_text" varchar,
      "version_light_mode_header_border" varchar,
      "version_dark_mode_background" varchar,
      "version_dark_mode_foreground" varchar,
      "version_dark_mode_foreground_muted" varchar,
      "version_dark_mode_accent" varchar,
      "version_dark_mode_border_color" varchar,
      "version_dark_mode_rule_color" varchar,
      "version_dark_mode_rule_strong_color" varchar,
      "version_dark_mode_header_top_bg" varchar,
      "version_dark_mode_header_top_text" varchar,
      "version_dark_mode_header_nav_bg" varchar,
      "version_dark_mode_header_nav_text" varchar,
      "version_dark_mode_header_border" varchar,
      "version_updated_at" timestamp(3) with time zone,
      "version_created_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "snapshot" boolean,
      "autosave" boolean,
      "latest" boolean
    );
    CREATE INDEX IF NOT EXISTS "_theme_v_parent_id_idx" ON "_theme_v" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "_theme_v_version_updated_at_idx" ON "_theme_v" USING btree ("version_updated_at");
    CREATE INDEX IF NOT EXISTS "_theme_v_latest_idx" ON "_theme_v" USING btree ("latest");

    -- Foreign keys for theme logo relationships
    DO $$ BEGIN
      ALTER TABLE "theme" ADD CONSTRAINT "theme_logos_desktop_light_id_logos_id_fk"
        FOREIGN KEY ("logos_desktop_light_id") REFERENCES "public"."logos"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "theme" ADD CONSTRAINT "theme_logos_desktop_dark_id_logos_id_fk"
        FOREIGN KEY ("logos_desktop_dark_id") REFERENCES "public"."logos"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "theme" ADD CONSTRAINT "theme_logos_mobile_light_id_logos_id_fk"
        FOREIGN KEY ("logos_mobile_light_id") REFERENCES "public"."logos"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "theme" ADD CONSTRAINT "theme_logos_mobile_dark_id_logos_id_fk"
        FOREIGN KEY ("logos_mobile_dark_id") REFERENCES "public"."logos"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- Foreign key for _theme_v parent
    DO $$ BEGIN
      ALTER TABLE "_theme_v" ADD CONSTRAINT "_theme_v_parent_id_theme_id_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."theme"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- Add logos to payload_locked_documents_rels
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "logos_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_logos_fk"
        FOREIGN KEY ("logos_id") REFERENCES "public"."logos"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_logos_id_idx"
      ON "payload_locked_documents_rels" ("logos_id");

    -- Seed theme with current hardcoded color values (only if no theme record exists yet)
    INSERT INTO "theme" (
      "light_mode_background", "light_mode_foreground", "light_mode_foreground_muted",
      "light_mode_accent", "light_mode_border_color", "light_mode_rule_color",
      "light_mode_rule_strong_color", "light_mode_header_top_bg", "light_mode_header_top_text",
      "light_mode_header_nav_bg", "light_mode_header_nav_text", "light_mode_header_border",
      "dark_mode_background", "dark_mode_foreground", "dark_mode_foreground_muted",
      "dark_mode_accent", "dark_mode_border_color", "dark_mode_rule_color",
      "dark_mode_rule_strong_color", "dark_mode_header_top_bg", "dark_mode_header_top_text",
      "dark_mode_header_nav_bg", "dark_mode_header_nav_text", "dark_mode_header_border"
    )
    SELECT
      '#ffffff', '#000000', '#5f5f5f', '#D6001C', '#d8d8d8',
      'rgba(0, 0, 0, 0.15)', 'rgba(0, 0, 0, 0.8)',
      '#ffffff', '#000000', '#ffffff', '#000000', '#d8d8d8',
      '#0a0a0a', '#e8e8e8', '#c8ced6', '#d96b76', '#3a3a3a',
      'rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.4)',
      '#0a0a0a', '#e8e8e8', '#0a0a0a', '#e8e8e8', '#3a3a3a'
    WHERE NOT EXISTS (SELECT 1 FROM "theme");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "logos_id";
    DROP TABLE IF EXISTS "_theme_v";
    DROP TABLE IF EXISTS "theme";
    DROP TABLE IF EXISTS "logos";
  `)
}
