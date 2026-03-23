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
  ('20260322_231000_add_user_retired', 6, NOW(), NOW())
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

-- 20260322: Add 'more' to opinion_type enums
ALTER TYPE "public"."enum_articles_opinion_type" ADD VALUE IF NOT EXISTS 'more';
ALTER TYPE "public"."enum__articles_v_version_opinion_type" ADD VALUE IF NOT EXISTS 'more';
SQL
