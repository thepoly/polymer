import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Create the `get_involved_page` table backing the Get Involved Page global:
 * the pinned photo behind /get-involved and its focus point and zoom for
 * phones, tablets and desktop. Column defaults match the field defaults in
 * collections/GetInvolvedPage.ts. Globals get no payload_locked_documents_rels
 * column.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "get_involved_page" (
      "id" serial PRIMARY KEY NOT NULL,
      "photo_id" integer,
      "mobile_focus_x" numeric DEFAULT 70,
      "mobile_focus_y" numeric DEFAULT 85,
      "mobile_zoom" numeric DEFAULT 1.6,
      "tablet_focus_x" numeric DEFAULT 70,
      "tablet_focus_y" numeric DEFAULT 60,
      "tablet_zoom" numeric DEFAULT 1,
      "desktop_focus_x" numeric DEFAULT 70,
      "desktop_focus_y" numeric DEFAULT 60,
      "desktop_zoom" numeric DEFAULT 1,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    DO $$ BEGIN
      ALTER TABLE "get_involved_page"
        ADD CONSTRAINT "get_involved_page_photo_id_media_id_fk"
        FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "get_involved_page_photo_idx"
      ON "get_involved_page" USING btree ("photo_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "get_involved_page";
  `)
}
