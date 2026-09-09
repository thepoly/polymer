import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `articles.focal_point_acknowledged` and its version shadow.
 *
 * Photo features refuse to publish unless their lead image has a focal point,
 * because the hero crops to fill the viewport and a centre crop takes faces
 * first. Payload writes 50/50 for any upload whose focal point has never been
 * moved, so "untouched" cannot be told apart from "deliberately centred" —
 * this column is how an editor says centre framing is intended, so that check
 * cannot deadlock them.
 *
 * Nullable with a `false` default, so existing rows need no backfill: an
 * article only consults it while publishing as a photo feature.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles"
      ADD COLUMN IF NOT EXISTS "focal_point_acknowledged" boolean DEFAULT false;
    ALTER TABLE "_articles_v"
      ADD COLUMN IF NOT EXISTS "version_focal_point_acknowledged" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_focal_point_acknowledged";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "focal_point_acknowledged";
  `)
}
