import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // The original migration created a custom enum "opinion_type_enum".
  // Payload expects enums named "enum_articles_opinion_type" and "enum__articles_v_version_opinion_type".
  // We need to: 1) create the new enums with all values, 2) migrate columns, 3) drop old enum.

  // Step 1: Create the Payload-standard enum types with all new values
  await db.execute(sql`
    CREATE TYPE "public"."enum_articles_opinion_type" AS ENUM(
      'opinion', 'column', 'staff-editorial', 'editorial-notebook',
      'endorsement', 'top-hat', 'candidate-profile', 'letter-to-the-editor',
      'polys-recommendations', 'other'
    );
  `)

  await db.execute(sql`
    CREATE TYPE "public"."enum__articles_v_version_opinion_type" AS ENUM(
      'opinion', 'column', 'staff-editorial', 'editorial-notebook',
      'endorsement', 'top-hat', 'candidate-profile', 'letter-to-the-editor',
      'polys-recommendations', 'other'
    );
  `)

  // Step 2: Migrate old values before changing the column type
  await db.execute(sql`
    UPDATE "articles" SET "opinion_type" = 'column' WHERE "opinion_type" = 'columnist';
    UPDATE "articles" SET "opinion_type" = 'other' WHERE "opinion_type" IN ('more', 'special-edition');
  `)

  await db.execute(sql`
    UPDATE "_articles_v" SET "version_opinion_type" = 'column' WHERE "version_opinion_type" = 'columnist';
    UPDATE "_articles_v" SET "version_opinion_type" = 'other' WHERE "version_opinion_type" IN ('more', 'special-edition');
  `)

  // Step 3: Alter columns to use the new enum types
  await db.execute(sql`
    ALTER TABLE "articles"
      ALTER COLUMN "opinion_type" SET DATA TYPE "public"."enum_articles_opinion_type"
      USING "opinion_type"::text::"public"."enum_articles_opinion_type";
  `)

  await db.execute(sql`
    ALTER TABLE "_articles_v"
      ALTER COLUMN "version_opinion_type" SET DATA TYPE "public"."enum__articles_v_version_opinion_type"
      USING "version_opinion_type"::text::"public"."enum__articles_v_version_opinion_type";
  `)

  // Step 4: Drop the old custom enum
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."opinion_type_enum";
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Recreate old enum
  await db.execute(sql`
    CREATE TYPE "public"."opinion_type_enum" AS ENUM('opinion', 'columnist', 'staff-editorial', 'editorial-notebook', 'special-edition', 'more');
  `)

  // Revert data
  await db.execute(sql`
    UPDATE "articles" SET "opinion_type" = 'columnist' WHERE "opinion_type" = 'column';
    UPDATE "articles" SET "opinion_type" = 'more' WHERE "opinion_type" = 'other';
    UPDATE "_articles_v" SET "version_opinion_type" = 'columnist' WHERE "version_opinion_type" = 'column';
    UPDATE "_articles_v" SET "version_opinion_type" = 'more' WHERE "version_opinion_type" = 'other';
  `)

  // Revert columns to old enum
  await db.execute(sql`
    ALTER TABLE "articles"
      ALTER COLUMN "opinion_type" SET DATA TYPE "public"."opinion_type_enum"
      USING "opinion_type"::text::"public"."opinion_type_enum";

    ALTER TABLE "_articles_v"
      ALTER COLUMN "version_opinion_type" SET DATA TYPE "public"."opinion_type_enum"
      USING "version_opinion_type"::text::"public"."opinion_type_enum";
  `)

  // Drop new enums
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum__articles_v_version_opinion_type";
    DROP TYPE IF EXISTS "public"."enum_articles_opinion_type";
  `)
}
