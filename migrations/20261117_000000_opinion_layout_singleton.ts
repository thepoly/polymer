import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres';

// Keep the document previously chosen by Payload's default newest-first order.
// Other documents remain available to administrators as archives; no content is deleted.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
DO $$ BEGIN
  IF to_regclass('public.opinion_page_layout_name_idx') IS NULL THEN
    LOCK TABLE "opinion_page_layout" IN EXCLUSIVE MODE;
    UPDATE "opinion_page_layout" SET "name" = 'Archived Opinion Layout #' || "id"
      WHERE "id" <> (SELECT "id" FROM "opinion_page_layout" ORDER BY "created_at" DESC, "id" DESC LIMIT 1);
    UPDATE "opinion_page_layout" SET "name" = 'Opinion Layout'
      WHERE "id" = (SELECT "id" FROM "opinion_page_layout" ORDER BY "created_at" DESC, "id" DESC LIMIT 1);
    CREATE UNIQUE INDEX "opinion_page_layout_name_idx" ON "opinion_page_layout" ("name");
  END IF;
END $$;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "opinion_page_layout_name_idx";`);
}
