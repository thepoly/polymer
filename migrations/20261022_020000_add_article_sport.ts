import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `sport` on articles (sports section only), for per-sport pages. Nullable, so
 * existing articles need no backfill; editors label them over time. Values
 * mirror lib/sports.ts — adding a sport later means ALTER TYPE ... ADD VALUE
 * on both enums.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_articles_sport" AS ENUM('mens-ice-hockey', 'womens-ice-hockey', 'mens-basketball', 'womens-basketball', 'football', 'mens-soccer', 'womens-soccer', 'mens-lacrosse', 'womens-lacrosse', 'baseball', 'softball', 'field-hockey', 'mens-swimming-and-diving', 'womens-swimming-and-diving', 'mens-track-and-field', 'womens-track-and-field', 'mens-cross-country', 'womens-cross-country', 'mens-tennis', 'womens-tennis', 'golf', 'club-sports', 'intramurals', 'general');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__articles_v_version_sport" AS ENUM('mens-ice-hockey', 'womens-ice-hockey', 'mens-basketball', 'womens-basketball', 'football', 'mens-soccer', 'womens-soccer', 'mens-lacrosse', 'womens-lacrosse', 'baseball', 'softball', 'field-hockey', 'mens-swimming-and-diving', 'womens-swimming-and-diving', 'mens-track-and-field', 'womens-track-and-field', 'mens-cross-country', 'womens-cross-country', 'mens-tennis', 'womens-tennis', 'golf', 'club-sports', 'intramurals', 'general');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "sport" "public"."enum_articles_sport";
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_sport" "public"."enum__articles_v_version_sport";

    CREATE INDEX IF NOT EXISTS "articles_sport_idx" ON "articles" USING btree ("sport");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_version_sport_idx" ON "_articles_v" USING btree ("version_sport");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "articles_sport_idx";
    DROP INDEX IF EXISTS "_articles_v_version_version_sport_idx";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "sport";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_sport";
    DROP TYPE IF EXISTS "public"."enum_articles_sport";
    DROP TYPE IF EXISTS "public"."enum__articles_v_version_sport";
  `)
}
