import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add `site_section` to `live-articles` (+ version shadow).
 *
 * `live_articles.section` already existed but is a free-text topic label for
 * the homepage strip ("Labor Department", "Election Night") — it is not the
 * site's section taxonomy. Live article pages need the real taxonomy so they
 * can render the short scroll header and the "Continue Reading / <Section>"
 * recommendations block the way standard article pages do.
 *
 * Existing rows are backfilled to 'news', which matches the only live article
 * shipped so far and is the safest default for a required field.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_live_articles_site_section" AS ENUM('news', 'sports', 'features', 'opinion');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum__live_articles_v_version_site_section" AS ENUM('news', 'sports', 'features', 'opinion');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "live_articles"
      ADD COLUMN IF NOT EXISTS "site_section" "enum_live_articles_site_section" DEFAULT 'news';
    ALTER TABLE "_live_articles_v"
      ADD COLUMN IF NOT EXISTS "version_site_section" "enum__live_articles_v_version_site_section" DEFAULT 'news';

    UPDATE "live_articles" SET "site_section" = 'news' WHERE "site_section" IS NULL;
    UPDATE "_live_articles_v" SET "version_site_section" = 'news' WHERE "version_site_section" IS NULL;

    CREATE INDEX IF NOT EXISTS "live_articles_site_section_idx"
      ON "live_articles" USING btree ("site_section");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "live_articles_site_section_idx";
    ALTER TABLE "_live_articles_v" DROP COLUMN IF EXISTS "version_site_section";
    ALTER TABLE "live_articles" DROP COLUMN IF EXISTS "site_section";
    DROP TYPE IF EXISTS "public"."enum__live_articles_v_version_site_section";
    DROP TYPE IF EXISTS "public"."enum_live_articles_site_section";
  `)
}
