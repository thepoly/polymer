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
  ('20260317_200000_add_opinion_type_and_caption', 2, NOW(), NOW())
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
SQL
