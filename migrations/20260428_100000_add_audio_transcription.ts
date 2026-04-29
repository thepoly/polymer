import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_audio_jobs_kind" AS ENUM('interview','meeting','presser','lecture','court','other');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_audio_jobs_status" AS ENUM('queued','dispatching','processing','completed','failed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "audio_files" (
      "id" serial PRIMARY KEY NOT NULL,
      "duration_seconds" numeric,
      "uploader_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "audio_files_filename_idx" ON "audio_files" USING btree ("filename");
    CREATE INDEX IF NOT EXISTS "audio_files_uploader_idx" ON "audio_files" USING btree ("uploader_id");
    CREATE INDEX IF NOT EXISTS "audio_files_created_at_idx" ON "audio_files" USING btree ("created_at");
    DO $$ BEGIN
      ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_uploader_id_users_id_fk"
        FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "audio_jobs" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "kind" "public"."enum_audio_jobs_kind" NOT NULL DEFAULT 'interview',
      "notes" varchar,
      "audio_file_id" integer NOT NULL,
      "uploader_id" integer,
      "status" "public"."enum_audio_jobs_status" NOT NULL DEFAULT 'queued',
      "external_job_id" varchar,
      "callback_secret" varchar,
      "progress" numeric,
      "dispatch_attempts" numeric DEFAULT 0,
      "error" varchar,
      "transcribed_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS "audio_jobs_status_idx" ON "audio_jobs" USING btree ("status");
    CREATE INDEX IF NOT EXISTS "audio_jobs_uploader_idx" ON "audio_jobs" USING btree ("uploader_id");
    CREATE INDEX IF NOT EXISTS "audio_jobs_created_at_idx" ON "audio_jobs" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "audio_jobs_external_job_id_idx" ON "audio_jobs" USING btree ("external_job_id") WHERE "external_job_id" IS NOT NULL;
    DO $$ BEGIN
      ALTER TABLE "audio_jobs" ADD CONSTRAINT "audio_jobs_audio_file_id_audio_files_id_fk"
        FOREIGN KEY ("audio_file_id") REFERENCES "public"."audio_files"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "audio_jobs" ADD CONSTRAINT "audio_jobs_uploader_id_users_id_fk"
        FOREIGN KEY ("uploader_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS "transcripts" (
      "id" serial PRIMARY KEY NOT NULL,
      "audio_job_id" integer NOT NULL,
      "data" jsonb NOT NULL,
      "searchable_text" text,
      "edited_at" timestamp(3) with time zone,
      "edited_by_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "transcripts_audio_job_idx" ON "transcripts" USING btree ("audio_job_id");
    CREATE INDEX IF NOT EXISTS "transcripts_searchable_text_fts_idx" ON "transcripts"
      USING gin (to_tsvector('english', coalesce("searchable_text", '')));
    DO $$ BEGIN
      ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_audio_job_id_audio_jobs_id_fk"
        FOREIGN KEY ("audio_job_id") REFERENCES "public"."audio_jobs"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_edited_by_id_users_id_fk"
        FOREIGN KEY ("edited_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "audio_files_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "audio_jobs_id" integer;
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "transcripts_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audio_files_fk"
        FOREIGN KEY ("audio_files_id") REFERENCES "public"."audio_files"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audio_jobs_fk"
        FOREIGN KEY ("audio_jobs_id") REFERENCES "public"."audio_jobs"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_transcripts_fk"
        FOREIGN KEY ("transcripts_id") REFERENCES "public"."transcripts"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_audio_files_id_idx" ON "payload_locked_documents_rels" ("audio_files_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_audio_jobs_id_idx" ON "payload_locked_documents_rels" ("audio_jobs_id");
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_transcripts_id_idx" ON "payload_locked_documents_rels" ("transcripts_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_transcripts_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_audio_jobs_fk";
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_audio_files_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_transcripts_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_audio_jobs_id_idx";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_audio_files_id_idx";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "transcripts_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "audio_jobs_id";
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "audio_files_id";
    DROP TABLE IF EXISTS "transcripts";
    DROP TABLE IF EXISTS "audio_jobs";
    DROP TABLE IF EXISTS "audio_files";
    DROP TYPE IF EXISTS "public"."enum_audio_jobs_status";
    DROP TYPE IF EXISTS "public"."enum_audio_jobs_kind";
  `)
}
