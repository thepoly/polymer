import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "sports_page_layout_id";
    DROP TABLE IF EXISTS "sports_page_layout";
  `)
}
