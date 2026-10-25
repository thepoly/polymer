import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Schools (opponents, with logos) and the game-result fields on articles:
 * opponent, home/away, both scores and the game status. All new columns are
 * nullable, so existing articles need no backfill.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "schools" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "short_name" varchar,
      "conference" varchar,
      "athletics_url" varchar,
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
    CREATE UNIQUE INDEX IF NOT EXISTS "schools_name_idx" ON "schools" USING btree ("name");
    CREATE INDEX IF NOT EXISTS "schools_created_at_idx" ON "schools" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "schools_filename_idx" ON "schools" USING btree ("filename");

    DO $$ BEGIN
      CREATE TYPE "public"."enum_articles_home_away" AS ENUM('home', 'away', 'neutral');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__articles_v_version_home_away" AS ENUM('home', 'away', 'neutral');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "opponent_id" integer;
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "home_away" "public"."enum_articles_home_away";
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "rpi_score" numeric;
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "opponent_score" numeric;
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "game_status" varchar;

    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_opponent_id" integer;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_home_away" "public"."enum__articles_v_version_home_away";
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_rpi_score" numeric;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_opponent_score" numeric;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_game_status" varchar;

    DO $$ BEGIN
      ALTER TABLE "articles" ADD CONSTRAINT "articles_opponent_id_schools_id_fk"
        FOREIGN KEY ("opponent_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_opponent_id_schools_id_fk"
        FOREIGN KEY ("version_opponent_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    CREATE INDEX IF NOT EXISTS "articles_opponent_idx" ON "articles" USING btree ("opponent_id");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_version_opponent_idx" ON "_articles_v" USING btree ("version_opponent_id");

    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "schools_id" integer;
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_schools_fk"
        FOREIGN KEY ("schools_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_schools_id_idx"
      ON "payload_locked_documents_rels" ("schools_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "schools_id";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "opponent_id";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "home_away";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "rpi_score";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "opponent_score";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "game_status";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_opponent_id";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_home_away";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_rpi_score";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_opponent_score";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_game_status";
    DROP TYPE IF EXISTS "public"."enum_articles_home_away";
    DROP TYPE IF EXISTS "public"."enum__articles_v_version_home_away";
    DROP TABLE IF EXISTS "schools";
  `)
}
