import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Backfill the `sizes_gallery_*` and `sizes_card_*` columns that the Media
 * collection's `imageSizes` config has referenced for some time. Production
 * acquired these via Payload's dev-only `push` mode at some point and they
 * were never captured as a migration; this fills the gap so a fresh DB
 * built only from migrations matches the expected schema.
 *
 * Idempotent — uses `ADD COLUMN IF NOT EXISTS` so it is a no-op against any
 * environment that already has these columns.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_gallery_url" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_gallery_width" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_gallery_height" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_gallery_mime_type" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_gallery_filesize" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_gallery_filename" varchar;

    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_url" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_width" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_height" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_mime_type" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_filesize" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_filename" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_gallery_url";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_gallery_width";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_gallery_height";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_gallery_mime_type";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_gallery_filesize";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_gallery_filename";

    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_url";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_width";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_height";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_mime_type";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_filesize";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_filename";
  `)
}
