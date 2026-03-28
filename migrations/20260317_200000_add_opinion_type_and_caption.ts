import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_articles_opinion_type" AS ENUM('opinion', 'column', 'staff-editorial', 'editorial-notebook', 'endorsement', 'top-hat', 'candidate-profile', 'letter-to-the-editor', 'polys-recommendations', 'editors-notebook', 'derby', 'other');
    CREATE TYPE "public"."enum__articles_v_version_opinion_type" AS ENUM('opinion', 'column', 'staff-editorial', 'editorial-notebook', 'endorsement', 'top-hat', 'candidate-profile', 'letter-to-the-editor', 'polys-recommendations', 'editors-notebook', 'derby', 'other');
    ALTER TABLE "articles" ADD COLUMN "opinion_type" "public"."enum_articles_opinion_type";
    ALTER TABLE "articles" ADD COLUMN "image_caption" varchar;
    ALTER TABLE "_articles_v" ADD COLUMN "version_opinion_type" "public"."enum__articles_v_version_opinion_type";
    ALTER TABLE "_articles_v" ADD COLUMN "version_image_caption" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "opinion_type";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "image_caption";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_opinion_type";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_image_caption";
    DROP TYPE IF EXISTS "public"."enum_articles_opinion_type";
    DROP TYPE IF EXISTS "public"."enum__articles_v_version_opinion_type";
  `)
}
