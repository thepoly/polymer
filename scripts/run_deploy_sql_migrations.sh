#!/usr/bin/env bash

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must be set}"

psql "$DATABASE_URL" <<'SQL'
-- Ensure migration tracking is up to date
DELETE FROM payload_migrations WHERE batch = -1;
INSERT INTO payload_migrations (name, batch, updated_at, created_at)
VALUES
  ('20260211_224237_initial_baseline', 1, NOW(), NOW()),
  ('20260213_223303_remove_copy_workflow', 1, NOW(), NOW()),
  ('20260217_015404_add_photographer_to_media', 1, NOW(), NOW()),
  ('20260310_211734_add_user_slug', 1, NOW(), NOW()),
  ('20260316_144021_add_layout_top4', 1, NOW(), NOW()),
  ('20260316_145613_remove_editorial_section', 1, NOW(), NOW()),
  ('20260317_200000_add_opinion_type_and_caption', 2, NOW(), NOW()),
  ('20260320_200000_add_write_in_authors', 3, NOW(), NOW()),
  ('20260321_200000_add_layout_template', 4, NOW(), NOW()),
  ('20260321_210000_add_layout_sections_and_volume', 4, NOW(), NOW()),
  ('20260321_055436_add_opinion_page_layout', 5, NOW(), NOW()),
  ('20260322_200000_add_seo_fields', 5, NOW(), NOW()),
  ('20260322_210000_add_media_source_url', 5, NOW(), NOW()),
  ('20260322_220000_add_more_to_opinion_type_enum', 6, NOW(), NOW()),
  ('20260322_230000_add_write_in_photographer_to_media', 6, NOW(), NOW()),
  ('20260322_231000_add_user_retired', 6, NOW(), NOW()),
  ('20260324_220000_add_user_seen_newsroom_notice', 7, NOW(), NOW()),
  ('20260328_000000_add_user_one_liner', 8, NOW(), NOW()),
  ('20260328_100000_add_submissions', 8, NOW(), NOW()),
  ('20260328_200000_add_event_submissions', 8, NOW(), NOW()),
  ('20260328_300000_add_features_page_layout', 8, NOW(), NOW()),
  ('20260329_100000_add_follytechnic', 9, NOW(), NOW()),
  ('20260331_100000_add_photofeature', 10, NOW(), NOW()),
  ('20260401_000000_add_theme_and_logos', 11, NOW(), NOW()),
  ('20260401_010000_add_seo_global', 11, NOW(), NOW()),
  ('20260402_000000_add_staff_page_layout', 12, NOW(), NOW()),
  ('20260402_100000_add_media_title', 13, NOW(), NOW()),
  ('20260404_000000_add_header_animation', 14, NOW(), NOW()),
  ('20260405_000000_migrate_title_to_richtext', 15, NOW(), NOW()),
  ('20260409_000000_backfill_plain_title', 16, NOW(), NOW()),
  ('20260420_000000_add_live_articles', 17, NOW(), NOW()),
  ('20260423_000000_layout_versions_and_remove_edition', 18, NOW(), NOW()),
  ('20260423_010000_add_articles_last_modified_by', 19, NOW(), NOW()),
  ('20260423_020000_add_gemini_to_layout_skeleton', 20, NOW(), NOW()),
  ('20260423_030000_add_header_animation_enabled', 21, NOW(), NOW()),
  ('20260423_040000_add_last_modified_by_to_layout_live_theme', 22, NOW(), NOW()),
  ('20260424_000000_add_news_more_seo_fields', 23, NOW(), NOW()),
  ('20260424_010000_add_breaking_news', 24, NOW(), NOW()),
  ('20260424_020000_add_device_tokens', 25, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 20260317: Add opinion_type and image_caption columns
DO $$ BEGIN
  CREATE TYPE "public"."enum_articles_opinion_type" AS ENUM('opinion', 'column', 'staff-editorial', 'editorial-notebook', 'endorsement', 'top-hat', 'candidate-profile', 'letter-to-the-editor', 'polys-recommendations', 'editors-notebook', 'derby', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "public"."enum__articles_v_version_opinion_type" AS ENUM('opinion', 'column', 'staff-editorial', 'editorial-notebook', 'endorsement', 'top-hat', 'candidate-profile', 'letter-to-the-editor', 'polys-recommendations', 'editors-notebook', 'derby', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "opinion_type" "public"."enum_articles_opinion_type";
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "image_caption" varchar;
ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_opinion_type" "public"."enum__articles_v_version_opinion_type";
ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_image_caption" varchar;

-- 20260320: Add write-in authors array tables
CREATE TABLE IF NOT EXISTS "articles_write_in_authors" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL,
  "photo_id" integer,
  "_uuid" varchar NOT NULL DEFAULT gen_random_uuid()
);
CREATE TABLE IF NOT EXISTS "_articles_v_version_write_in_authors" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar,
  "photo_id" integer,
  "_uuid" varchar
);
-- Backfill _uuid if tables already existed without it
ALTER TABLE "articles_write_in_authors" ADD COLUMN IF NOT EXISTS "_uuid" varchar NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE "_articles_v_version_write_in_authors" ADD COLUMN IF NOT EXISTS "_uuid" varchar;
DO $$ BEGIN
  ALTER TABLE "articles_write_in_authors"
    ADD CONSTRAINT "articles_write_in_authors_photo_id_media_id_fk"
    FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "articles_write_in_authors"
    ADD CONSTRAINT "articles_write_in_authors_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "_articles_v_version_write_in_authors"
    ADD CONSTRAINT "_articles_v_version_write_in_authors_photo_id_media_id_fk"
    FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "_articles_v_version_write_in_authors"
    ADD CONSTRAINT "_articles_v_version_write_in_authors_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "articles_write_in_authors_order_idx" ON "articles_write_in_authors" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "articles_write_in_authors_parent_id_idx" ON "articles_write_in_authors" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "articles_write_in_authors_photo_idx" ON "articles_write_in_authors" USING btree ("photo_id");
CREATE INDEX IF NOT EXISTS "_articles_v_version_write_in_authors_order_idx" ON "_articles_v_version_write_in_authors" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "_articles_v_version_write_in_authors_parent_id_idx" ON "_articles_v_version_write_in_authors" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "_articles_v_version_write_in_authors_photo_idx" ON "_articles_v_version_write_in_authors" USING btree ("photo_id");

-- 20260320: Add grid JSON field to layout
ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "grid" jsonb;

-- 20260321: Add skeleton field to layout
ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "skeleton" varchar DEFAULT 'custom';

-- 20260321: Add section_layouts JSON field to layout
ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "section_layouts" jsonb;

-- 20260321: Add volume and edition fields to layout
ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "volume" numeric;
ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "edition" numeric;

-- 20260321: Add section field to users (for section editor assignment)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "section" varchar;

-- 20260321: Add opinion_page_layout tables
CREATE TABLE IF NOT EXISTS "opinion_page_layout" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL,
  "editors_choice_label" varchar,
  "editors_choice1_id" integer,
  "editors_choice2_id" integer,
  "editors_choice3_id" integer,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "opinion_page_layout_quotes" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "text" varchar NOT NULL,
  "article_id" integer NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "opinion_page_layout" ADD CONSTRAINT "opinion_page_layout_editors_choice1_id_articles_id_fk" FOREIGN KEY ("editors_choice1_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "opinion_page_layout" ADD CONSTRAINT "opinion_page_layout_editors_choice2_id_articles_id_fk" FOREIGN KEY ("editors_choice2_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "opinion_page_layout" ADD CONSTRAINT "opinion_page_layout_editors_choice3_id_articles_id_fk" FOREIGN KEY ("editors_choice3_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "opinion_page_layout_quotes" ADD CONSTRAINT "opinion_page_layout_quotes_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "opinion_page_layout_quotes" ADD CONSTRAINT "opinion_page_layout_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."opinion_page_layout"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "opinion_page_layout_editors_choice1_idx" ON "opinion_page_layout" USING btree ("editors_choice1_id");
CREATE INDEX IF NOT EXISTS "opinion_page_layout_editors_choice2_idx" ON "opinion_page_layout" USING btree ("editors_choice2_id");
CREATE INDEX IF NOT EXISTS "opinion_page_layout_editors_choice3_idx" ON "opinion_page_layout" USING btree ("editors_choice3_id");
CREATE INDEX IF NOT EXISTS "opinion_page_layout_created_at_idx" ON "opinion_page_layout" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "opinion_page_layout_quotes_order_idx" ON "opinion_page_layout_quotes" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "opinion_page_layout_quotes_parent_id_idx" ON "opinion_page_layout_quotes" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "opinion_page_layout_quotes_article_idx" ON "opinion_page_layout_quotes" USING btree ("article_id");

-- Fix missing opinion_page_layout FK in locked documents rels
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "opinion_page_layout_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_opinion_page_layout_fk"
    FOREIGN KEY ("opinion_page_layout_id") REFERENCES "public"."opinion_page_layout"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_opinion_page_layout_id_idx"
  ON "payload_locked_documents_rels" ("opinion_page_layout_id");

-- 20260322: Add SEO fields to articles
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "seo_title" varchar;
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "search_description" varchar;
ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_seo_title" varchar;
ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_search_description" varchar;

-- 20260322: Add source_url to media and backfill legacy remote media
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "source_url" varchar;
UPDATE "media"
SET "source_url" = "url"
WHERE "url" LIKE 'http://10.10.10.22:8080/media/%'
  AND ("source_url" IS NULL OR "source_url" = '');

-- 20260322: Add write-in photographer to media
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "write_in_photographer" varchar;

-- 20260322: Add retired checkbox to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "retired" boolean DEFAULT false;

-- 20260324: Add latest seen version marker to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "latest_version" varchar DEFAULT '0.0.0';

-- 20260322: Add 'more' to opinion_type enums
ALTER TYPE "public"."enum_articles_opinion_type" ADD VALUE IF NOT EXISTS 'more';
ALTER TYPE "public"."enum__articles_v_version_opinion_type" ADD VALUE IF NOT EXISTS 'more';

-- 20260328: Add one_liner text field to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "one_liner" varchar;

-- 20260328: Add submissions table
DO $$ BEGIN
  CREATE TYPE "public"."enum_submissions_opinion_type" AS ENUM(
    'opinion', 'column', 'staff-editorial', 'editorial-notebook',
    'endorsement', 'top-hat', 'candidate-profile', 'letter-to-the-editor',
    'polys-recommendations', 'editors-notebook', 'derby', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "public"."enum_submissions_status" AS ENUM('new', 'reviewed', 'published', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "submissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar NOT NULL,
  "opinion_type" "public"."enum_submissions_opinion_type" NOT NULL,
  "author_name" varchar NOT NULL,
  "contact" varchar NOT NULL,
  "featured_image_id" integer,
  "featured_image_caption" varchar,
  "content" varchar NOT NULL,
  "status" "public"."enum_submissions_status" DEFAULT 'new',
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_featured_image_id_media_id_fk"
    FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "submissions_created_at_idx" ON "submissions" USING btree ("created_at");
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "submissions_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submissions_fk"
    FOREIGN KEY ("submissions_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_submissions_id_idx"
  ON "payload_locked_documents_rels" ("submissions_id");

-- 20260328: Add event_submissions table
DO $$ BEGIN
  CREATE TYPE "public"."enum_event_submissions_status" AS ENUM('new', 'reviewed', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE TABLE IF NOT EXISTS "event_submissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "event_name" varchar NOT NULL,
  "date" timestamp(3) with time zone NOT NULL,
  "time" varchar NOT NULL,
  "description" varchar NOT NULL,
  "contact_name" varchar,
  "contact_info" varchar,
  "status" "public"."enum_event_submissions_status" DEFAULT 'new',
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "event_submissions_created_at_idx" ON "event_submissions" USING btree ("created_at");
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "event_submissions_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_event_submissions_fk"
    FOREIGN KEY ("event_submissions_id") REFERENCES "public"."event_submissions"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_event_submissions_id_idx"
  ON "payload_locked_documents_rels" ("event_submissions_id");

-- 20260329: Add is_follytechnic to articles
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "is_follytechnic" boolean DEFAULT false;
ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_is_follytechnic" boolean DEFAULT false;

-- 20260328: Add features_page_layout table
CREATE TABLE IF NOT EXISTS "features_page_layout" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL DEFAULT 'Features Layout',
  "layout" jsonb,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "features_page_layout_created_at_idx" ON "features_page_layout" USING btree ("created_at");
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "features_page_layout_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_features_page_layout_fk"
    FOREIGN KEY ("features_page_layout_id") REFERENCES "public"."features_page_layout"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_features_page_layout_id_idx"
  ON "payload_locked_documents_rels" ("features_page_layout_id");

-- 20260331: Add is_photofeature and gradient_opacity to articles
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "is_photofeature" boolean DEFAULT false;
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "gradient_opacity" numeric;
ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_is_photofeature" boolean DEFAULT false;
ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_gradient_opacity" numeric;

-- 20260401: Add logos collection and theme global
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
DO $$ BEGIN
  ALTER TABLE "_theme_v" ADD CONSTRAINT "_theme_v_parent_id_theme_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."theme"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "logos_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_logos_fk"
    FOREIGN KEY ("logos_id") REFERENCES "public"."logos"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_logos_id_idx"
  ON "payload_locked_documents_rels" ("logos_id");

-- Seed theme with current hardcoded color values (skipped if record already exists)
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

-- 20260401: Add SEO global
CREATE TABLE IF NOT EXISTS "seo" (
  "id" serial PRIMARY KEY NOT NULL,
  "site_identity_site_name" varchar,
  "site_identity_site_short_name" varchar,
  "site_identity_default_title" varchar,
  "site_identity_title_suffix" varchar,
  "site_identity_default_description" varchar,
  "site_identity_apple_web_app_title" varchar,
  "site_identity_manifest_description" varchar,
  "site_identity_organization_description" varchar,
  "pages_archive_title" varchar,
  "pages_archive_description" varchar,
  "pages_search_title" varchar,
  "pages_search_description" varchar,
  "pages_submit_title" varchar,
  "pages_submit_description" varchar,
  "pages_staff_title" varchar,
  "pages_staff_description" varchar,
  "pages_features_archive_title" varchar,
  "pages_features_archive_description" varchar,
  "pages_features_submit_event_title" varchar,
  "pages_features_submit_event_description" varchar,
  "pages_opinion_other_title" varchar,
  "pages_opinion_other_description" varchar,
  "pages_opinion_editorials_title" varchar,
  "pages_opinion_editorials_description" varchar,
  "pages_opinion_more_title" varchar,
  "pages_opinion_more_description" varchar,
  "sections_news_description" varchar,
  "sections_sports_description" varchar,
  "sections_features_description" varchar,
  "sections_opinion_description" varchar,
  "templates_section_fallback_description" varchar,
  "templates_article_fallback_description" varchar,
  "templates_staff_profile_description" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "_seo_v" (
  "id" serial PRIMARY KEY NOT NULL,
  "parent_id" integer,
  "version_site_identity_site_name" varchar,
  "version_site_identity_site_short_name" varchar,
  "version_site_identity_default_title" varchar,
  "version_site_identity_title_suffix" varchar,
  "version_site_identity_default_description" varchar,
  "version_site_identity_apple_web_app_title" varchar,
  "version_site_identity_manifest_description" varchar,
  "version_site_identity_organization_description" varchar,
  "version_pages_archive_title" varchar,
  "version_pages_archive_description" varchar,
  "version_pages_search_title" varchar,
  "version_pages_search_description" varchar,
  "version_pages_submit_title" varchar,
  "version_pages_submit_description" varchar,
  "version_pages_staff_title" varchar,
  "version_pages_staff_description" varchar,
  "version_pages_features_archive_title" varchar,
  "version_pages_features_archive_description" varchar,
  "version_pages_features_submit_event_title" varchar,
  "version_pages_features_submit_event_description" varchar,
  "version_pages_opinion_other_title" varchar,
  "version_pages_opinion_other_description" varchar,
  "version_pages_opinion_editorials_title" varchar,
  "version_pages_opinion_editorials_description" varchar,
  "version_pages_opinion_more_title" varchar,
  "version_pages_opinion_more_description" varchar,
  "version_sections_news_description" varchar,
  "version_sections_sports_description" varchar,
  "version_sections_features_description" varchar,
  "version_sections_opinion_description" varchar,
  "version_templates_section_fallback_description" varchar,
  "version_templates_article_fallback_description" varchar,
  "version_templates_staff_profile_description" varchar,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "snapshot" boolean,
  "autosave" boolean,
  "latest" boolean
);
CREATE INDEX IF NOT EXISTS "_seo_v_parent_id_idx" ON "_seo_v" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "_seo_v_version_updated_at_idx" ON "_seo_v" USING btree ("version_updated_at");
CREATE INDEX IF NOT EXISTS "_seo_v_latest_idx" ON "_seo_v" USING btree ("latest");
DO $$ BEGIN
  ALTER TABLE "_seo_v" ADD CONSTRAINT "_seo_v_parent_id_seo_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."seo"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "seo_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_seo_fk"
    FOREIGN KEY ("seo_id") REFERENCES "public"."seo"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_seo_id_idx"
  ON "payload_locked_documents_rels" ("seo_id");

INSERT INTO "seo" (
  "site_identity_site_name",
  "site_identity_site_short_name",
  "site_identity_default_title",
  "site_identity_title_suffix",
  "site_identity_default_description",
  "site_identity_apple_web_app_title",
  "site_identity_manifest_description",
  "site_identity_organization_description",
  "pages_archive_title",
  "pages_archive_description",
  "pages_search_title",
  "pages_search_description",
  "pages_submit_title",
  "pages_submit_description",
  "pages_staff_title",
  "pages_staff_description",
  "pages_features_archive_title",
  "pages_features_archive_description",
  "pages_features_submit_event_title",
  "pages_features_submit_event_description",
  "pages_opinion_other_title",
  "pages_opinion_other_description",
  "pages_opinion_editorials_title",
  "pages_opinion_editorials_description",
  "pages_opinion_more_title",
  "pages_opinion_more_description",
  "sections_news_description",
  "sections_sports_description",
  "sections_features_description",
  "sections_opinion_description",
  "templates_section_fallback_description",
  "templates_article_fallback_description",
  "templates_staff_profile_description"
)
SELECT
  'The Polytechnic',
  'The Poly',
  'The Polytechnic',
  'The Polytechnic',
  'The Polytechnic is Rensselaer Polytechnic Institute''s student run newspaper, serving the RPI community since 1885.',
  'The Poly',
  'Serving the Rensselaer Community Since 1885',
  'Rensselaer Polytechnic Institute''s student run newspaper, serving the RPI community since 1885.',
  'Archive',
  'Browse The Polytechnic by publication date with the archive time machine.',
  'Search',
  'Search articles from The Polytechnic, RPI''s student newspaper.',
  'Submit',
  'Submit an article, letter to the editor, or opinion piece to The Polytechnic.',
  'Staff',
  'Meet the editorial staff of The Polytechnic, RPI''s student run newspaper.',
  'More in Features',
  'All features articles from The Polytechnic.',
  'Submit an Event',
  'Submit an event to be featured by The Polytechnic.',
  'Other',
  'Columns, reviews, and other opinion formats from The Polytechnic.',
  'Editorials',
  'Staff editorials, editorial notebooks, and endorsements from The Polytechnic.',
  'More in Opinion',
  'General opinion pieces and letters to the editor from The Polytechnic.',
  'The latest news from Rensselaer Polytechnic Institute and the Troy community.',
  'Coverage of RPI varsity athletics, club sports, and intramurals.',
  'In-depth features, profiles, and longform journalism from the RPI community.',
  'Editorials, columns, and letters to the editor from The Polytechnic.',
  '{sectionTitle} articles from {siteName}.',
  'Read "{title}" in {siteName}''s {section} section.',
  '{name} — staff member at {siteName}, RPI''s student newspaper.'
WHERE NOT EXISTS (SELECT 1 FROM "seo");

-- 20260402: Add users.major and staff_page_layout collection
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "major" varchar;

CREATE TABLE IF NOT EXISTS "staff_page_layout" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL DEFAULT 'Staff Page Layout',
  "hero_left_id" integer,
  "hero_right_id" integer,
  "column_left_lead_id" integer,
  "column_left_support_id" integer,
  "column_right_lead_id" integer,
  "column_right_support_id" integer,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
DO $$ BEGIN
  ALTER TABLE "staff_page_layout" ADD CONSTRAINT "staff_page_layout_hero_left_id_users_id_fk"
    FOREIGN KEY ("hero_left_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "staff_page_layout" ADD CONSTRAINT "staff_page_layout_hero_right_id_users_id_fk"
    FOREIGN KEY ("hero_right_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "staff_page_layout" ADD CONSTRAINT "staff_page_layout_column_left_lead_id_users_id_fk"
    FOREIGN KEY ("column_left_lead_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "staff_page_layout" ADD CONSTRAINT "staff_page_layout_column_left_support_id_users_id_fk"
    FOREIGN KEY ("column_left_support_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "staff_page_layout" ADD CONSTRAINT "staff_page_layout_column_right_lead_id_users_id_fk"
    FOREIGN KEY ("column_right_lead_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "staff_page_layout" ADD CONSTRAINT "staff_page_layout_column_right_support_id_users_id_fk"
    FOREIGN KEY ("column_right_support_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "staff_page_layout_hero_left_idx" ON "staff_page_layout" USING btree ("hero_left_id");
CREATE INDEX IF NOT EXISTS "staff_page_layout_hero_right_idx" ON "staff_page_layout" USING btree ("hero_right_id");
CREATE INDEX IF NOT EXISTS "staff_page_layout_column_left_lead_idx" ON "staff_page_layout" USING btree ("column_left_lead_id");
CREATE INDEX IF NOT EXISTS "staff_page_layout_column_left_support_idx" ON "staff_page_layout" USING btree ("column_left_support_id");
CREATE INDEX IF NOT EXISTS "staff_page_layout_column_right_lead_idx" ON "staff_page_layout" USING btree ("column_right_lead_id");
CREATE INDEX IF NOT EXISTS "staff_page_layout_column_right_support_idx" ON "staff_page_layout" USING btree ("column_right_support_id");
CREATE INDEX IF NOT EXISTS "staff_page_layout_created_at_idx" ON "staff_page_layout" USING btree ("created_at");

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "staff_page_layout_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_staff_page_layout_fk"
    FOREIGN KEY ("staff_page_layout_id") REFERENCES "public"."staff_page_layout"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_staff_page_layout_id_idx"
  ON "payload_locked_documents_rels" ("staff_page_layout_id");

-- 20260402_100000: Add title column to media
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "title" varchar;

-- 20260404_000000: Add header animation settings to theme
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

-- 20260405_000000: Migrate articles.title and _articles_v.version_title from varchar to jsonb (richText).
-- Idempotent: only converts if the column is still varchar. Wraps existing string values in a
-- minimal Lexical root/paragraph/text document so Payload keeps rendering them.
DO $$
BEGIN
  IF (
    SELECT data_type FROM information_schema.columns
    WHERE table_name = 'articles' AND column_name = 'title'
  ) = 'character varying' THEN
    ALTER TABLE "articles" RENAME COLUMN "title" TO "old_title";
    ALTER TABLE "articles" ADD COLUMN "title" jsonb;

    UPDATE "articles"
    SET "title" = jsonb_build_object(
      'root', jsonb_build_object(
        'type', 'root',
        'format', '',
        'indent', 0,
        'version', 1,
        'direction', 'ltr',
        'children', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'format', '',
            'indent', 0,
            'version', 1,
            'direction', 'ltr',
            'children', jsonb_build_array(
              jsonb_build_object(
                'type', 'text',
                'format', 0,
                'mode', 'normal',
                'style', '',
                'text', "old_title",
                'version', 1
              )
            )
          )
        )
      )
    );

    ALTER TABLE "articles" ALTER COLUMN "title" SET NOT NULL;
    ALTER TABLE "articles" DROP COLUMN "old_title";
  END IF;

  IF (
    SELECT data_type FROM information_schema.columns
    WHERE table_name = '_articles_v' AND column_name = 'version_title'
  ) = 'character varying' THEN
    ALTER TABLE "_articles_v" RENAME COLUMN "version_title" TO "old_version_title";
    ALTER TABLE "_articles_v" ADD COLUMN "version_title" jsonb;

    UPDATE "_articles_v"
    SET "version_title" = jsonb_build_object(
      'root', jsonb_build_object(
        'type', 'root',
        'format', '',
        'indent', 0,
        'version', 1,
        'direction', 'ltr',
        'children', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'format', '',
            'indent', 0,
            'version', 1,
            'direction', 'ltr',
            'children', jsonb_build_array(
              jsonb_build_object(
                'type', 'text',
                'format', 0,
                'mode', 'normal',
                'style', '',
                'text', "old_version_title",
                'version', 1
              )
            )
          )
        )
      )
    ) WHERE "old_version_title" IS NOT NULL;

    ALTER TABLE "_articles_v" DROP COLUMN "old_version_title";
  END IF;
END $$;

-- 20260409_000000: Add plain_title columns and backfill from the jsonb title by concatenating
-- every text node in document order. Only updates rows still missing plain_title so re-runs are cheap.
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "plain_title" varchar;
ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_plain_title" varchar;

UPDATE "articles"
SET "plain_title" = (
  SELECT string_agg(value->>'text', '' ORDER BY ordinality)
  FROM jsonb_path_query("title", 'strict $.**.children[*] ? (@.type == "text")')
    WITH ORDINALITY t(value, ordinality)
)
WHERE "plain_title" IS NULL AND "title" IS NOT NULL;

UPDATE "_articles_v"
SET "version_plain_title" = (
  SELECT string_agg(value->>'text', '' ORDER BY ordinality)
  FROM jsonb_path_query("version_title", 'strict $.**.children[*] ? (@.type == "text")')
    WITH ORDINALITY t(value, ordinality)
)
WHERE "version_plain_title" IS NULL AND "version_title" IS NOT NULL;

-- 20260420_000000: Add live_articles collection + layout.liveArticles relationship
DO $$ BEGIN
  CREATE TYPE "public"."enum_live_articles_status" AS ENUM('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."enum__live_articles_v_version_status" AS ENUM('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "live_articles" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" jsonb NOT NULL,
  "plain_title" varchar NOT NULL,
  "slug" varchar NOT NULL,
  "section" varchar NOT NULL,
  "hero_id" integer NOT NULL,
  "published_date" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "_status" "public"."enum_live_articles_status" DEFAULT 'draft'
);

CREATE TABLE IF NOT EXISTS "live_articles_summary" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "label" varchar NOT NULL,
  "body" jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS "live_articles_updates" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "timestamp" timestamp(3) with time zone NOT NULL,
  "heading" varchar,
  "body" jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS "live_articles_rels" (
  "id" serial PRIMARY KEY NOT NULL,
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" varchar NOT NULL,
  "users_id" integer
);

CREATE TABLE IF NOT EXISTS "_live_articles_v" (
  "id" serial PRIMARY KEY NOT NULL,
  "parent_id" integer,
  "version_title" jsonb,
  "version_plain_title" varchar,
  "version_slug" varchar,
  "version_section" varchar,
  "version_hero_id" integer,
  "version_published_date" timestamp(3) with time zone,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "version__status" "public"."enum__live_articles_v_version_status" DEFAULT 'draft',
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "latest" boolean
);

CREATE TABLE IF NOT EXISTS "_live_articles_v_version_summary" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial PRIMARY KEY NOT NULL,
  "label" varchar,
  "body" jsonb,
  "_uuid" varchar
);

CREATE TABLE IF NOT EXISTS "_live_articles_v_version_updates" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" serial PRIMARY KEY NOT NULL,
  "timestamp" timestamp(3) with time zone,
  "heading" varchar,
  "body" jsonb,
  "_uuid" varchar
);

CREATE TABLE IF NOT EXISTS "_live_articles_v_rels" (
  "id" serial PRIMARY KEY NOT NULL,
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" varchar NOT NULL,
  "users_id" integer
);

DO $$ BEGIN
  ALTER TABLE "live_articles" ADD CONSTRAINT "live_articles_hero_id_media_id_fk"
    FOREIGN KEY ("hero_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "live_articles_summary" ADD CONSTRAINT "live_articles_summary_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."live_articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "live_articles_updates" ADD CONSTRAINT "live_articles_updates_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."live_articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "live_articles_rels" ADD CONSTRAINT "live_articles_rels_parent_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."live_articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "live_articles_rels" ADD CONSTRAINT "live_articles_rels_users_fk"
    FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "_live_articles_v" ADD CONSTRAINT "_live_articles_v_parent_id_live_articles_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."live_articles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "_live_articles_v" ADD CONSTRAINT "_live_articles_v_version_hero_id_media_id_fk"
    FOREIGN KEY ("version_hero_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "_live_articles_v_version_summary" ADD CONSTRAINT "_live_articles_v_version_summary_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."_live_articles_v"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "_live_articles_v_version_updates" ADD CONSTRAINT "_live_articles_v_version_updates_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."_live_articles_v"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "_live_articles_v_rels" ADD CONSTRAINT "_live_articles_v_rels_parent_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."_live_articles_v"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "_live_articles_v_rels" ADD CONSTRAINT "_live_articles_v_rels_users_fk"
    FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "live_articles_slug_idx" ON "live_articles" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "live_articles_hero_idx" ON "live_articles" USING btree ("hero_id");
CREATE INDEX IF NOT EXISTS "live_articles_updated_at_idx" ON "live_articles" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "live_articles_created_at_idx" ON "live_articles" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "live_articles__status_idx" ON "live_articles" USING btree ("_status");
CREATE INDEX IF NOT EXISTS "live_articles_summary_order_idx" ON "live_articles_summary" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "live_articles_summary_parent_id_idx" ON "live_articles_summary" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "live_articles_updates_order_idx" ON "live_articles_updates" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "live_articles_updates_parent_id_idx" ON "live_articles_updates" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "live_articles_rels_order_idx" ON "live_articles_rels" USING btree ("order");
CREATE INDEX IF NOT EXISTS "live_articles_rels_parent_idx" ON "live_articles_rels" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "live_articles_rels_path_idx" ON "live_articles_rels" USING btree ("path");
CREATE INDEX IF NOT EXISTS "live_articles_rels_users_id_idx" ON "live_articles_rels" USING btree ("users_id");
CREATE INDEX IF NOT EXISTS "_live_articles_v_parent_idx" ON "_live_articles_v" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "_live_articles_v_version_version_hero_idx" ON "_live_articles_v" USING btree ("version_hero_id");
CREATE INDEX IF NOT EXISTS "_live_articles_v_version_version_slug_idx" ON "_live_articles_v" USING btree ("version_slug");
CREATE INDEX IF NOT EXISTS "_live_articles_v_version_version_updated_at_idx" ON "_live_articles_v" USING btree ("version_updated_at");
CREATE INDEX IF NOT EXISTS "_live_articles_v_version_version_created_at_idx" ON "_live_articles_v" USING btree ("version_created_at");
CREATE INDEX IF NOT EXISTS "_live_articles_v_version_version__status_idx" ON "_live_articles_v" USING btree ("version__status");
CREATE INDEX IF NOT EXISTS "_live_articles_v_created_at_idx" ON "_live_articles_v" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "_live_articles_v_updated_at_idx" ON "_live_articles_v" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "_live_articles_v_latest_idx" ON "_live_articles_v" USING btree ("latest");
CREATE INDEX IF NOT EXISTS "_live_articles_v_version_summary_order_idx" ON "_live_articles_v_version_summary" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "_live_articles_v_version_summary_parent_id_idx" ON "_live_articles_v_version_summary" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "_live_articles_v_version_updates_order_idx" ON "_live_articles_v_version_updates" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "_live_articles_v_version_updates_parent_id_idx" ON "_live_articles_v_version_updates" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "_live_articles_v_rels_order_idx" ON "_live_articles_v_rels" USING btree ("order");
CREATE INDEX IF NOT EXISTS "_live_articles_v_rels_parent_idx" ON "_live_articles_v_rels" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "_live_articles_v_rels_path_idx" ON "_live_articles_v_rels" USING btree ("path");
CREATE INDEX IF NOT EXISTS "_live_articles_v_rels_users_id_idx" ON "_live_articles_v_rels" USING btree ("users_id");

CREATE TABLE IF NOT EXISTS "layout_rels" (
  "id" serial PRIMARY KEY NOT NULL,
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" varchar NOT NULL,
  "live_articles_id" integer
);

DO $$ BEGIN
  ALTER TABLE "layout_rels" ADD CONSTRAINT "layout_rels_parent_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."layout"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "layout_rels" ADD CONSTRAINT "layout_rels_live_articles_fk"
    FOREIGN KEY ("live_articles_id") REFERENCES "public"."live_articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "layout_rels_order_idx" ON "layout_rels" USING btree ("order");
CREATE INDEX IF NOT EXISTS "layout_rels_parent_idx" ON "layout_rels" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "layout_rels_path_idx" ON "layout_rels" USING btree ("path");
CREATE INDEX IF NOT EXISTS "layout_rels_live_articles_id_idx" ON "layout_rels" USING btree ("live_articles_id");

ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "live_articles_id" integer;
DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_live_articles_fk"
    FOREIGN KEY ("live_articles_id") REFERENCES "public"."live_articles"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_live_articles_id_idx"
  ON "payload_locked_documents_rels" ("live_articles_id");

-- 20260423_000000: Enable versions on layout + remove volume/edition columns.
-- Edition is now derived from articles.publishedDate via lib/getCurrentEdition.ts.
ALTER TABLE "layout" DROP COLUMN IF EXISTS "volume";
ALTER TABLE "layout" DROP COLUMN IF EXISTS "edition";

CREATE TABLE IF NOT EXISTS "_layout_v" (
  "id" serial PRIMARY KEY NOT NULL,
  "parent_id" integer,
  "version_name" varchar,
  "version_skeleton" varchar DEFAULT 'custom',
  "version_grid" jsonb,
  "version_section_layouts" jsonb,
  "version_main_article_id" integer,
  "version_top1_id" integer,
  "version_top2_id" integer,
  "version_top3_id" integer,
  "version_top4_id" integer,
  "version_op1_id" integer,
  "version_op2_id" integer,
  "version_op3_id" integer,
  "version_op4_id" integer,
  "version_special_id" integer,
  "version_updated_at" timestamp(3) with time zone,
  "version_created_at" timestamp(3) with time zone,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "latest" boolean
);

CREATE TABLE IF NOT EXISTS "_layout_v_rels" (
  "id" serial PRIMARY KEY NOT NULL,
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" varchar NOT NULL,
  "live_articles_id" integer
);

DO $$ BEGIN
  ALTER TABLE "_layout_v" ADD CONSTRAINT "_layout_v_parent_id_layout_id_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."layout"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "_layout_v" ADD CONSTRAINT "_layout_v_main_article_fk"
    FOREIGN KEY ("version_main_article_id") REFERENCES "public"."articles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "_layout_v_rels" ADD CONSTRAINT "_layout_v_rels_parent_fk"
    FOREIGN KEY ("parent_id") REFERENCES "public"."_layout_v"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "_layout_v_rels" ADD CONSTRAINT "_layout_v_rels_live_articles_fk"
    FOREIGN KEY ("live_articles_id") REFERENCES "public"."live_articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "_layout_v_parent_idx" ON "_layout_v" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "_layout_v_version_updated_at_idx" ON "_layout_v" USING btree ("version_updated_at");
CREATE INDEX IF NOT EXISTS "_layout_v_latest_idx" ON "_layout_v" USING btree ("latest");
CREATE INDEX IF NOT EXISTS "_layout_v_rels_order_idx" ON "_layout_v_rels" USING btree ("order");
CREATE INDEX IF NOT EXISTS "_layout_v_rels_parent_idx" ON "_layout_v_rels" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "_layout_v_rels_path_idx" ON "_layout_v_rels" USING btree ("path");
CREATE INDEX IF NOT EXISTS "_layout_v_rels_live_articles_id_idx" ON "_layout_v_rels" USING btree ("live_articles_id");

-- 20260423_010000: Add lastModifiedBy relationship column to articles (+ version shadow)
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "last_modified_by_id" integer;
ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_last_modified_by_id" integer;

DO $$ BEGIN
  ALTER TABLE "articles" ADD CONSTRAINT "articles_last_modified_by_id_users_id_fk"
    FOREIGN KEY ("last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_last_modified_by_id_users_id_fk"
    FOREIGN KEY ("version_last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "articles_last_modified_by_idx" ON "articles" USING btree ("last_modified_by_id");
CREATE INDEX IF NOT EXISTS "_articles_v_version_version_last_modified_by_idx" ON "_articles_v" USING btree ("version_last_modified_by_id");

-- 20260423_020000: Add 'gemini' value to layout skeleton enum (only if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_layout_skeleton') THEN
    ALTER TYPE "public"."enum_layout_skeleton" ADD VALUE IF NOT EXISTS 'gemini';
  END IF;
END $$;

-- 20260423_030000: Add header_animation_enabled toggle to theme global
ALTER TABLE "theme" ADD COLUMN IF NOT EXISTS "header_animation_enabled" boolean DEFAULT true;
ALTER TABLE "_theme_v" ADD COLUMN IF NOT EXISTS "version_header_animation_enabled" boolean DEFAULT true;

-- 20260423_040000: Add lastModifiedBy tracking to Layout, LiveArticles, and Theme
ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "last_modified_by_id" integer;
ALTER TABLE "_layout_v" ADD COLUMN IF NOT EXISTS "version_last_modified_by_id" integer;

DO $$ BEGIN
  ALTER TABLE "layout" ADD CONSTRAINT "layout_last_modified_by_id_users_id_fk"
    FOREIGN KEY ("last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "_layout_v" ADD CONSTRAINT "_layout_v_version_last_modified_by_id_users_id_fk"
    FOREIGN KEY ("version_last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "layout_last_modified_by_idx" ON "layout" USING btree ("last_modified_by_id");
CREATE INDEX IF NOT EXISTS "_layout_v_version_version_last_modified_by_idx" ON "_layout_v" USING btree ("version_last_modified_by_id");

ALTER TABLE "live_articles" ADD COLUMN IF NOT EXISTS "last_modified_by_id" integer;
ALTER TABLE "_live_articles_v" ADD COLUMN IF NOT EXISTS "version_last_modified_by_id" integer;

DO $$ BEGIN
  ALTER TABLE "live_articles" ADD CONSTRAINT "live_articles_last_modified_by_id_users_id_fk"
    FOREIGN KEY ("last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "_live_articles_v" ADD CONSTRAINT "_live_articles_v_version_last_modified_by_id_users_id_fk"
    FOREIGN KEY ("version_last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "live_articles_last_modified_by_idx" ON "live_articles" USING btree ("last_modified_by_id");
CREATE INDEX IF NOT EXISTS "_live_articles_v_version_version_last_modified_by_idx" ON "_live_articles_v" USING btree ("version_last_modified_by_id");

ALTER TABLE "theme" ADD COLUMN IF NOT EXISTS "last_modified_by_id" integer;
ALTER TABLE "_theme_v" ADD COLUMN IF NOT EXISTS "version_last_modified_by_id" integer;

DO $$ BEGIN
  ALTER TABLE "theme" ADD CONSTRAINT "theme_last_modified_by_id_users_id_fk"
    FOREIGN KEY ("last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "_theme_v" ADD CONSTRAINT "_theme_v_version_last_modified_by_id_users_id_fk"
    FOREIGN KEY ("version_last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "theme_last_modified_by_idx" ON "theme" USING btree ("last_modified_by_id");
CREATE INDEX IF NOT EXISTS "_theme_v_version_version_last_modified_by_idx" ON "_theme_v" USING btree ("version_last_modified_by_id");

-- 20260424_000000: Add News "More in News" SEO fields to seo global
ALTER TABLE "seo" ADD COLUMN IF NOT EXISTS "pages_news_more_title" varchar;
ALTER TABLE "seo" ADD COLUMN IF NOT EXISTS "pages_news_more_description" varchar;
ALTER TABLE "_seo_v" ADD COLUMN IF NOT EXISTS "version_pages_news_more_title" varchar;
ALTER TABLE "_seo_v" ADD COLUMN IF NOT EXISTS "version_pages_news_more_description" varchar;

-- 20260424_010000: Add breaking_news flag to articles (+ version shadow)
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "breaking_news" boolean DEFAULT false NOT NULL;
ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_breaking_news" boolean DEFAULT false;

-- 20260424_020000: Create device_tokens table for push notification registration
DO $$ BEGIN
  CREATE TYPE "public"."enum_device_tokens_platform" AS ENUM('android', 'ios');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "device_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "token" varchar NOT NULL,
  "platform" "public"."enum_device_tokens_platform" DEFAULT 'android' NOT NULL,
  "last_seen_at" timestamp(3) with time zone,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "device_tokens_token_idx" ON "device_tokens" USING btree ("token");
CREATE INDEX IF NOT EXISTS "device_tokens_created_at_idx" ON "device_tokens" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "device_tokens_updated_at_idx" ON "device_tokens" USING btree ("updated_at");

ALTER TABLE "payload_locked_documents_rels"
  ADD COLUMN IF NOT EXISTS "device_tokens_id" integer;

DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels"
    ADD CONSTRAINT "payload_locked_documents_rels_device_tokens_fk"
    FOREIGN KEY ("device_tokens_id") REFERENCES "public"."device_tokens"("id")
    ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_device_tokens_id_idx"
  ON "payload_locked_documents_rels" ("device_tokens_id");
SQL
