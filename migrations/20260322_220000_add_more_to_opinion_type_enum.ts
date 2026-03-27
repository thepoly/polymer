import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_articles_opinion_type" ADD VALUE IF NOT EXISTS 'more';
    ALTER TYPE "public"."enum__articles_v_version_opinion_type" ADD VALUE IF NOT EXISTS 'more';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // PostgreSQL does not support removing values from enums directly.
  // Recreate the enums without 'more' and update columns.
  await db.execute(sql`
    ALTER TABLE "articles" ALTER COLUMN "opinion_type" TYPE text;
    ALTER TABLE "_articles_v" ALTER COLUMN "version_opinion_type" TYPE text;
    DROP TYPE IF EXISTS "public"."enum_articles_opinion_type";
    DROP TYPE IF EXISTS "public"."enum__articles_v_version_opinion_type";
    CREATE TYPE "public"."enum_articles_opinion_type" AS ENUM('opinion', 'column', 'staff-editorial', 'editorial-notebook', 'endorsement', 'top-hat', 'candidate-profile', 'letter-to-the-editor', 'polys-recommendations', 'editors-notebook', 'derby', 'other');
    CREATE TYPE "public"."enum__articles_v_version_opinion_type" AS ENUM('opinion', 'column', 'staff-editorial', 'editorial-notebook', 'endorsement', 'top-hat', 'candidate-profile', 'letter-to-the-editor', 'polys-recommendations', 'editors-notebook', 'derby', 'other');
    ALTER TABLE "articles" ALTER COLUMN "opinion_type" TYPE "public"."enum_articles_opinion_type" USING "opinion_type"::"public"."enum_articles_opinion_type";
    ALTER TABLE "_articles_v" ALTER COLUMN "version_opinion_type" TYPE "public"."enum__articles_v_version_opinion_type" USING "version_opinion_type"::"public"."enum__articles_v_version_opinion_type";
  `)
}
