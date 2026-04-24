import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    -- Layout
    ALTER TABLE "layout" ADD COLUMN IF NOT EXISTS "last_modified_by_id" integer;
    ALTER TABLE "_layout_v" ADD COLUMN IF NOT EXISTS "version_last_modified_by_id" integer;

    DO $$ BEGIN
      ALTER TABLE "layout" ADD CONSTRAINT "layout_last_modified_by_id_users_id_fk"
        FOREIGN KEY ("last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "_layout_v" ADD CONSTRAINT "_layout_v_version_last_modified_by_id_users_id_fk"
        FOREIGN KEY ("version_last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "layout_last_modified_by_idx" ON "layout" USING btree ("last_modified_by_id");
    CREATE INDEX IF NOT EXISTS "_layout_v_version_version_last_modified_by_idx" ON "_layout_v" USING btree ("version_last_modified_by_id");

    -- LiveArticles
    ALTER TABLE "live_articles" ADD COLUMN IF NOT EXISTS "last_modified_by_id" integer;
    ALTER TABLE "_live_articles_v" ADD COLUMN IF NOT EXISTS "version_last_modified_by_id" integer;

    DO $$ BEGIN
      ALTER TABLE "live_articles" ADD CONSTRAINT "live_articles_last_modified_by_id_users_id_fk"
        FOREIGN KEY ("last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "_live_articles_v" ADD CONSTRAINT "_live_articles_v_version_last_modified_by_id_users_id_fk"
        FOREIGN KEY ("version_last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "live_articles_last_modified_by_idx" ON "live_articles" USING btree ("last_modified_by_id");
    CREATE INDEX IF NOT EXISTS "_live_articles_v_version_version_last_modified_by_idx" ON "_live_articles_v" USING btree ("version_last_modified_by_id");

    -- Theme (global)
    ALTER TABLE "theme" ADD COLUMN IF NOT EXISTS "last_modified_by_id" integer;
    ALTER TABLE "_theme_v" ADD COLUMN IF NOT EXISTS "version_last_modified_by_id" integer;

    DO $$ BEGIN
      ALTER TABLE "theme" ADD CONSTRAINT "theme_last_modified_by_id_users_id_fk"
        FOREIGN KEY ("last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    DO $$ BEGIN
      ALTER TABLE "_theme_v" ADD CONSTRAINT "_theme_v_version_last_modified_by_id_users_id_fk"
        FOREIGN KEY ("version_last_modified_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE INDEX IF NOT EXISTS "theme_last_modified_by_idx" ON "theme" USING btree ("last_modified_by_id");
    CREATE INDEX IF NOT EXISTS "_theme_v_version_version_last_modified_by_idx" ON "_theme_v" USING btree ("version_last_modified_by_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "layout" DROP COLUMN IF EXISTS "last_modified_by_id";
    ALTER TABLE "_layout_v" DROP COLUMN IF EXISTS "version_last_modified_by_id";
    ALTER TABLE "live_articles" DROP COLUMN IF EXISTS "last_modified_by_id";
    ALTER TABLE "_live_articles_v" DROP COLUMN IF EXISTS "version_last_modified_by_id";
    ALTER TABLE "theme" DROP COLUMN IF EXISTS "last_modified_by_id";
    ALTER TABLE "_theme_v" DROP COLUMN IF EXISTS "version_last_modified_by_id";
  `)
}
