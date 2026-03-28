import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_event_submissions_status" AS ENUM(
        'new', 'reviewed', 'accepted', 'rejected'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "event_submissions" (
      "id" serial PRIMARY KEY NOT NULL,
      "event_name" varchar NOT NULL,
      "date" timestamp(3) with time zone NOT NULL,
      "time" varchar NOT NULL,
      "description" varchar NOT NULL,
      "contact_name" varchar,
      "contact_info" varchar,
      "status" "public"."enum_event_submissions_status" DEFAULT 'new',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "event_submissions_created_at_idx" ON "event_submissions" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "event_submissions_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_event_submissions_fk"
        FOREIGN KEY ("event_submissions_id") REFERENCES "public"."event_submissions"("id")
        ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_event_submissions_id_idx"
      ON "payload_locked_documents_rels" ("event_submissions_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "event_submissions";
    DROP TYPE IF EXISTS "public"."enum_event_submissions_status";
  `)
}
