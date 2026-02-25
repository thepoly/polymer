import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."opinion_type_enum" AS ENUM('opinion', 'columnist', 'staff-editorial', 'editorial-notebook', 'special-edition', 'more');

    ALTER TABLE "articles" ADD COLUMN "opinion_type" "opinion_type_enum";

    ALTER TABLE "_articles_v" ADD COLUMN "version_opinion_type" "opinion_type_enum";

    CREATE INDEX "articles_opinion_type_idx" ON "articles" USING btree ("opinion_type");

    CREATE INDEX "_articles_v_version_opinion_type_idx" ON "_articles_v" USING btree ("version_opinion_type");
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "_articles_v_version_opinion_type_idx";

    DROP INDEX IF EXISTS "articles_opinion_type_idx";

    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_opinion_type";

    ALTER TABLE "articles" DROP COLUMN IF EXISTS "opinion_type";

    DROP TYPE IF EXISTS "public"."opinion_type_enum";
  `)
}
