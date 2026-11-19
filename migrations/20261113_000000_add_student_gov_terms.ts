import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Student Senate / Executive Board terms (GM Week to GM Week) and their
 * leaders. Timeline entries are put in a term by date, so no existing table
 * changes apart from the locked-documents column every collection gets.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_student_gov_terms_body" AS ENUM('senate', 'eboard');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_student_gov_terms_leaders_how" AS ENUM('elected', 'runoff', 'appointed');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "student_gov_terms" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar,
      "slug" varchar,
      "body" "enum_student_gov_terms_body" NOT NULL,
      "number" numeric,
      "starts_on" timestamp(3) with time zone NOT NULL,
      "gm_week_on" timestamp(3) with time zone,
      "gm_week_story_id" integer,
      "has_coverage" boolean DEFAULT true,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "student_gov_terms_leaders" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "ordinal" numeric,
      "how" "enum_student_gov_terms_leaders_how" DEFAULT 'elected',
      "started_on" timestamp(3) with time zone
    );

    DO $$ BEGIN
      ALTER TABLE "student_gov_terms_leaders" ADD CONSTRAINT "student_gov_terms_leaders_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."student_gov_terms"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "student_gov_terms" ADD CONSTRAINT "student_gov_terms_gm_week_story_id_articles_id_fk"
        FOREIGN KEY ("gm_week_story_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "student_gov_terms_leaders_order_idx" ON "student_gov_terms_leaders" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "student_gov_terms_leaders_parent_id_idx" ON "student_gov_terms_leaders" USING btree ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "student_gov_terms_slug_idx" ON "student_gov_terms" USING btree ("slug");
    CREATE INDEX IF NOT EXISTS "student_gov_terms_starts_on_idx" ON "student_gov_terms" USING btree ("starts_on");
    CREATE INDEX IF NOT EXISTS "student_gov_terms_gm_week_story_idx" ON "student_gov_terms" USING btree ("gm_week_story_id");
    CREATE INDEX IF NOT EXISTS "student_gov_terms_updated_at_idx" ON "student_gov_terms" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "student_gov_terms_created_at_idx" ON "student_gov_terms" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "student_gov_terms_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_student_gov_terms_fk"
        FOREIGN KEY ("student_gov_terms_id") REFERENCES "public"."student_gov_terms"("id")
        ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_student_gov_terms_id_idx"
      ON "payload_locked_documents_rels" ("student_gov_terms_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "student_gov_terms_id";
    DROP TABLE IF EXISTS "student_gov_terms_leaders";
    DROP TABLE IF EXISTS "student_gov_terms";
    DROP TYPE IF EXISTS "public"."enum_student_gov_terms_leaders_how";
    DROP TYPE IF EXISTS "public"."enum_student_gov_terms_body";
  `)
}
