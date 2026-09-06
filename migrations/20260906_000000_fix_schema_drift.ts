import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Backfill five columns that exist in the Payload collection definitions but
 * were never added by a migration. Each was introduced by a collection change
 * that relied on dev-mode `db.push` to sync the schema, so environments built
 * purely from `migrations/` (fresh local checkouts, CI) end up missing them and
 * every query against the affected table fails with `column ... does not exist`.
 *
 *   layout.grid                                    (`grid`, json)
 *   opinion_page_layout.layout                     (`layout`, json)
 *   live_articles_updates.author_id                (`updates.author` -> users)
 *   _live_articles_v_version_updates.author_id     (version shadow of above)
 *   payload_locked_documents_rels.opinion_page_layout_id
 *
 * Note on `updates.author`: 20260420_000000_add_live_articles assumed this
 * relationship would live in `live_articles_rels` under path "updates.author".
 * It does not — Payload stores single-target, non-hasMany relationships as a
 * scalar `<field>_id` column on the array's own table, so the column belongs on
 * `live_articles_updates` directly. The `live_articles_rels` table is left
 * alone; it is harmless and still backs any future hasMany relationships.
 *
 * Every statement is idempotent. Production was built before migrations were
 * introduced here and already has these columns, so this migration is expected
 * to be a no-op there rather than a schema change.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "grid" jsonb;
    ALTER TABLE "opinion_page_layout" ADD COLUMN IF NOT EXISTS "layout" jsonb;

    ALTER TABLE "live_articles_updates" ADD COLUMN IF NOT EXISTS "author_id" integer;
    ALTER TABLE "_live_articles_v_version_updates" ADD COLUMN IF NOT EXISTS "author_id" integer;

    DO $$ BEGIN
      ALTER TABLE "live_articles_updates" ADD CONSTRAINT "live_articles_updates_author_id_users_id_fk"
        FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "_live_articles_v_version_updates" ADD CONSTRAINT "_live_articles_v_version_updates_author_id_users_id_fk"
        FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "live_articles_updates_author_idx"
      ON "live_articles_updates" USING btree ("author_id");
    CREATE INDEX IF NOT EXISTS "_live_articles_v_version_updates_author_idx"
      ON "_live_articles_v_version_updates" USING btree ("author_id");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "opinion_page_layout_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_opinion_page_layout_fk"
        FOREIGN KEY ("opinion_page_layout_id") REFERENCES "public"."opinion_page_layout"("id")
        ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_opinion_page_layout_id_idx"
      ON "payload_locked_documents_rels" ("opinion_page_layout_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "payload_locked_documents_rels_opinion_page_layout_id_idx";
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_opinion_page_layout_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "opinion_page_layout_id";

    DROP INDEX IF EXISTS "_live_articles_v_version_updates_author_idx";
    DROP INDEX IF EXISTS "live_articles_updates_author_idx";
    ALTER TABLE "_live_articles_v_version_updates"
      DROP CONSTRAINT IF EXISTS "_live_articles_v_version_updates_author_id_users_id_fk";
    ALTER TABLE "live_articles_updates"
      DROP CONSTRAINT IF EXISTS "live_articles_updates_author_id_users_id_fk";
    ALTER TABLE "_live_articles_v_version_updates" DROP COLUMN IF EXISTS "author_id";
    ALTER TABLE "live_articles_updates" DROP COLUMN IF EXISTS "author_id";

    ALTER TABLE "opinion_page_layout" DROP COLUMN IF EXISTS "layout";
    ALTER TABLE "layout" DROP COLUMN IF EXISTS "grid";
  `)
}
