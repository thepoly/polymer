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
  ('20260321_210000_add_layout_sections_and_volume', 4, NOW(), NOW())
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
SQL
