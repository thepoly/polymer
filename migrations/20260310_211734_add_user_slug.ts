import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "slug" varchar;
   
   UPDATE "users"
   SET "slug" = subquery.new_slug
   FROM (
     SELECT id,
            BTRIM(LOWER(REGEXP_REPLACE("first_name" || '-' || "last_name", '[^a-zA-Z0-9]+', '-', 'g')), '-') || 
            CASE 
              WHEN ROW_NUMBER() OVER (PARTITION BY "first_name", "last_name" ORDER BY "id") > 1 
              THEN '-' || CAST(ROW_NUMBER() OVER (PARTITION BY "first_name", "last_name" ORDER BY "id") AS varchar) 
              ELSE '' 
            END as new_slug
     FROM "users"
   ) AS subquery
   WHERE "users"."id" = subquery."id";

  CREATE UNIQUE INDEX "users_slug_idx" ON "users" USING btree ("slug");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "users_slug_idx";
  ALTER TABLE "users" DROP COLUMN "slug";`)
}
