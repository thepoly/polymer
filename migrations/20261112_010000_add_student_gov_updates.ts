import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_student_gov_updates_body" AS ENUM('senate', 'eboard');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "student_gov_updates" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "body" "enum_student_gov_updates_body" NOT NULL,
      "blurb" varchar NOT NULL,
      "date" timestamp(3) with time zone NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE INDEX IF NOT EXISTS "student_gov_updates_date_idx" ON "student_gov_updates" USING btree ("date");
    CREATE INDEX IF NOT EXISTS "student_gov_updates_updated_at_idx" ON "student_gov_updates" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "student_gov_updates_created_at_idx" ON "student_gov_updates" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "student_gov_updates_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_student_gov_updates_fk"
        FOREIGN KEY ("student_gov_updates_id") REFERENCES "public"."student_gov_updates"("id")
        ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_student_gov_updates_id_idx"
      ON "payload_locked_documents_rels" ("student_gov_updates_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "student_gov_updates_id";
    DROP TABLE IF EXISTS "student_gov_updates";
    DROP TYPE IF EXISTS "public"."enum_student_gov_updates_body";
  `)
}
