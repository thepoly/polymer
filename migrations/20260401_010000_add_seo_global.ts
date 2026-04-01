import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "seo_id" integer;
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
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "seo_id";
    DROP TABLE IF EXISTS "_seo_v";
    DROP TABLE IF EXISTS "seo";
  `)
}
