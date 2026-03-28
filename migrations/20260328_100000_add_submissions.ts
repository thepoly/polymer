import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_submissions_opinion_type" AS ENUM(
        'opinion', 'column', 'staff-editorial', 'editorial-notebook',
        'endorsement', 'top-hat', 'candidate-profile', 'letter-to-the-editor',
        'polys-recommendations', 'editors-notebook', 'derby', 'other'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_submissions_status" AS ENUM(
        'new', 'reviewed', 'published', 'rejected'
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "submissions" (
      "id" serial PRIMARY KEY NOT NULL,
      "title" varchar NOT NULL,
      "opinion_type" "public"."enum_submissions_opinion_type" NOT NULL,
      "author_name" varchar NOT NULL,
      "contact" varchar NOT NULL,
      "featured_image_id" integer,
      "featured_image_caption" varchar,
      "content" varchar NOT NULL,
      "status" "public"."enum_submissions_status" DEFAULT 'new',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "submissions"
        ADD CONSTRAINT "submissions_featured_image_id_media_id_fk"
        FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "submissions_featured_image_idx" ON "submissions" USING btree ("featured_image_id");
    CREATE INDEX IF NOT EXISTS "submissions_created_at_idx" ON "submissions" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "submissions_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_submissions_fk"
        FOREIGN KEY ("submissions_id") REFERENCES "public"."submissions"("id")
        ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_submissions_id_idx"
      ON "payload_locked_documents_rels" ("submissions_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "submissions";
    DROP TYPE IF EXISTS "public"."enum_submissions_opinion_type";
    DROP TYPE IF EXISTS "public"."enum_submissions_status";
  `)
}
