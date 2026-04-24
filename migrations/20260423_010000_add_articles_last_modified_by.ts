import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Add `lastModifiedBy` relationship column on `articles` and mirror it into
 * the `_articles_v` version shadow table. Payload stores single-target,
 * non-hasMany relationships as scalar `<field>_id` columns on the parent
 * table rather than in the `_rels` join table.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "last_modified_by_id" integer;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_last_modified_by_id" integer;

    DO $$ BEGIN
      ALTER TABLE "articles" ADD CONSTRAINT "articles_last_modified_by_id_users_id_fk"
        FOREIGN KEY ("last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_last_modified_by_id_users_id_fk"
        FOREIGN KEY ("version_last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "articles_last_modified_by_idx" ON "articles" USING btree ("last_modified_by_id");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_version_last_modified_by_idx" ON "_articles_v" USING btree ("version_last_modified_by_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "articles_last_modified_by_idx";
    DROP INDEX IF EXISTS "_articles_v_version_version_last_modified_by_idx";
    ALTER TABLE "articles" DROP CONSTRAINT IF EXISTS "articles_last_modified_by_id_users_id_fk";
    ALTER TABLE "_articles_v" DROP CONSTRAINT IF EXISTS "_articles_v_version_last_modified_by_id_users_id_fk";
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "last_modified_by_id";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_last_modified_by_id";
  `)
}
