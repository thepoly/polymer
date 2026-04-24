import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Status enums for drafts/published (matches Articles pattern).
    DO $$ BEGIN
      CREATE TYPE "public"."enum_live_articles_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum__live_articles_v_version_status" AS ENUM('draft', 'published');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- Main table for published/current live-article documents.
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

    -- Array sub-tables for live_articles.summary and live_articles.updates.
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

    -- Rels table: author relationship inside the updates array lives here
    -- with path "updates.author". Any future polymorphic/hasMany relationships
    -- on live-articles also flow through this table.
    CREATE TABLE IF NOT EXISTS "live_articles_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "users_id" integer
    );

    -- Versions (drafts) mirror of the main table with a version_ prefix.
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

    -- Foreign keys for live_articles.
    DO $$ BEGIN
      ALTER TABLE "live_articles"
        ADD CONSTRAINT "live_articles_hero_id_media_id_fk"
        FOREIGN KEY ("hero_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "live_articles_summary"
        ADD CONSTRAINT "live_articles_summary_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."live_articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "live_articles_updates"
        ADD CONSTRAINT "live_articles_updates_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."live_articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "live_articles_rels"
        ADD CONSTRAINT "live_articles_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."live_articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "live_articles_rels"
        ADD CONSTRAINT "live_articles_rels_users_fk"
        FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- Foreign keys for _live_articles_v.
    DO $$ BEGIN
      ALTER TABLE "_live_articles_v"
        ADD CONSTRAINT "_live_articles_v_parent_id_live_articles_id_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."live_articles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_live_articles_v"
        ADD CONSTRAINT "_live_articles_v_version_hero_id_media_id_fk"
        FOREIGN KEY ("version_hero_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_live_articles_v_version_summary"
        ADD CONSTRAINT "_live_articles_v_version_summary_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."_live_articles_v"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_live_articles_v_version_updates"
        ADD CONSTRAINT "_live_articles_v_version_updates_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."_live_articles_v"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_live_articles_v_rels"
        ADD CONSTRAINT "_live_articles_v_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."_live_articles_v"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_live_articles_v_rels"
        ADD CONSTRAINT "_live_articles_v_rels_users_fk"
        FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    -- Indexes for live_articles and its sub-tables.
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

    -- Layout.liveArticles is a hasMany relationship, so it lives in layout_rels.
    CREATE TABLE IF NOT EXISTS "layout_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "live_articles_id" integer
    );

    DO $$ BEGIN
      ALTER TABLE "layout_rels"
        ADD CONSTRAINT "layout_rels_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "public"."layout"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "layout_rels"
        ADD CONSTRAINT "layout_rels_live_articles_fk"
        FOREIGN KEY ("live_articles_id") REFERENCES "public"."live_articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "layout_rels_order_idx" ON "layout_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "layout_rels_parent_idx" ON "layout_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "layout_rels_path_idx" ON "layout_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "layout_rels_live_articles_id_idx" ON "layout_rels" USING btree ("live_articles_id");

    -- Register live_articles in the global locked-documents rels table.
    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "live_articles_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_live_articles_fk"
        FOREIGN KEY ("live_articles_id") REFERENCES "public"."live_articles"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_live_articles_id_idx"
      ON "payload_locked_documents_rels" ("live_articles_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_live_articles_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_live_articles_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "live_articles_id";

    DROP TABLE IF EXISTS "layout_rels";

    DROP TABLE IF EXISTS "_live_articles_v_rels";
    DROP TABLE IF EXISTS "_live_articles_v_version_updates";
    DROP TABLE IF EXISTS "_live_articles_v_version_summary";
    DROP TABLE IF EXISTS "_live_articles_v";
    DROP TABLE IF EXISTS "live_articles_rels";
    DROP TABLE IF EXISTS "live_articles_updates";
    DROP TABLE IF EXISTS "live_articles_summary";
    DROP TABLE IF EXISTS "live_articles";

    DROP TYPE IF EXISTS "public"."enum__live_articles_v_version_status";
    DROP TYPE IF EXISTS "public"."enum_live_articles_status";
  `)
}
