import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "features_page_layout" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL DEFAULT 'Features Layout',
      "layout" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "features_page_layout_created_at_idx" ON "features_page_layout" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "features_page_layout_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_features_page_layout_fk"
        FOREIGN KEY ("features_page_layout_id") REFERENCES "public"."features_page_layout"("id")
        ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_features_page_layout_id_idx"
      ON "payload_locked_documents_rels" ("features_page_layout_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "features_page_layout";
  `)
}
