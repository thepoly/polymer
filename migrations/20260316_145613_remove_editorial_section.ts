import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles" ALTER COLUMN "section" SET DATA TYPE text USING "section"::text;
  UPDATE "articles" SET "section" = 'opinion' WHERE "section" = 'editorial';
  ALTER TABLE "_articles_v" ALTER COLUMN "version_section" SET DATA TYPE text USING "version_section"::text;
  UPDATE "_articles_v" SET "version_section" = 'opinion' WHERE "version_section" = 'editorial';
  DROP TYPE IF EXISTS "public"."enum_articles_section";
  DROP TYPE IF EXISTS "public"."enum__articles_v_version_section";
  CREATE TYPE "public"."enum_articles_section" AS ENUM('news', 'sports', 'features', 'opinion');
  CREATE TYPE "public"."enum__articles_v_version_section" AS ENUM('news', 'sports', 'features', 'opinion');
  ALTER TABLE "articles" ALTER COLUMN "section" SET DATA TYPE "public"."enum_articles_section" USING (
    CASE
      WHEN "section" IS NULL THEN NULL
      WHEN "section" IN ('news', 'sports', 'features', 'opinion', 'editorial') THEN
        CASE WHEN "section" = 'editorial' THEN 'opinion' ELSE "section" END
      ELSE 'opinion'
    END
  )::"public"."enum_articles_section";
  ALTER TABLE "_articles_v" ALTER COLUMN "version_section" SET DATA TYPE "public"."enum__articles_v_version_section" USING (
    CASE
      WHEN "version_section" IS NULL THEN NULL
      WHEN "version_section" IN ('news', 'sports', 'features', 'opinion', 'editorial') THEN
        CASE WHEN "version_section" = 'editorial' THEN 'opinion' ELSE "version_section" END
      ELSE 'opinion'
    END
  )::"public"."enum__articles_v_version_section";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_articles_section" ADD VALUE 'editorial' BEFORE 'opinion';
  ALTER TYPE "public"."enum__articles_v_version_section" ADD VALUE 'editorial' BEFORE 'opinion';`)
}
