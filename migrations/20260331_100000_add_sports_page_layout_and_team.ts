import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Add team enum and column to articles
    DO $$ BEGIN
      CREATE TYPE "public"."enum_articles_team" AS ENUM (
        'mens-basketball','womens-basketball','mens-hockey','womens-hockey',
        'football','mens-soccer','womens-soccer','mens-lacrosse','womens-lacrosse',
        'baseball','softball','swimming-diving','track-field','cross-country',
        'golf','tennis','club-sports','intramurals','other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "team" "public"."enum_articles_team";

    -- Add versioned team column
    DO $$ BEGIN
      CREATE TYPE "public"."enum__articles_v_version_team" AS ENUM (
        'mens-basketball','womens-basketball','mens-hockey','womens-hockey',
        'football','mens-soccer','womens-soccer','mens-lacrosse','womens-lacrosse',
        'baseball','softball','swimming-diving','track-field','cross-country',
        'golf','tennis','club-sports','intramurals','other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_team" "public"."enum__articles_v_version_team";

    -- Create sports_page_layout table
    CREATE TABLE IF NOT EXISTS "sports_page_layout" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL DEFAULT 'Sports Layout',
      "layout" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "sports_page_layout_created_at_idx" ON "sports_page_layout" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "sports_page_layout_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_sports_page_layout_fk"
        FOREIGN KEY ("sports_page_layout_id") REFERENCES "public"."sports_page_layout"("id")
        ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_sports_page_layout_id_idx"
      ON "payload_locked_documents_rels" ("sports_page_layout_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "team";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_team";
    DROP TYPE IF EXISTS "public"."enum_articles_team";
    DROP TYPE IF EXISTS "public"."enum__articles_v_version_team";
    DROP TABLE IF EXISTS "sports_page_layout";
  `)
}
