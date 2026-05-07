import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add a `legacy_shortlinks` table mapping the 5-char codes from the WordPress
 * `pluginSL_shorturl` plugin (12,872 rows) to their target URL. Used by the
 * request middleware to 301 `/<code>` to either a canonical polymer URL or
 * the original external destination.
 *
 * Not a Payload collection — there's no editorial reason to surface these
 * in the admin UI, and exposing 12K rows there would be noisy. Pure DB
 * lookup table.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "legacy_shortlinks" (
      "short_code" varchar PRIMARY KEY,
      "target_url" varchar NOT NULL,
      "hit_count" integer NOT NULL DEFAULT 0,
      "created_at" timestamp(3) with time zone NOT NULL DEFAULT NOW()
    );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "legacy_shortlinks";`)
}
