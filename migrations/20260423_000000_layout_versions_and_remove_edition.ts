import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Enable versions on the `layout` collection and remove the edition/volume
 * columns now that edition numbers are derived at read time from the articles
 * table (see `lib/getCurrentEdition.ts`).
 *
 * Creates _layout_v and _layout_v_rels to mirror Payload's version schema for
 * collections with `versions: { drafts: false }`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Drop the columns Payload no longer knows about. Values are discarded;
    -- the edition is now derived from articles.publishedDate. No data backfill
    -- is needed — the anchor (CXLIII, 9) in lib/getCurrentEdition.ts is what
    -- keeps history consistent.
    ALTER TABLE "layout" DROP COLUMN IF EXISTS "volume";
    ALTER TABLE "layout" DROP COLUMN IF EXISTS "edition";

    -- Versions table for Layout (drafts: false snapshots).
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
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "_layout_v_rels";
    DROP TABLE IF EXISTS "_layout_v";
    ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "volume" numeric;
    ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "edition" numeric;
  `)
}
