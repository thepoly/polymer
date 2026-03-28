import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "articles_write_in_authors" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "photo_id" integer,
      "_uuid" varchar NOT NULL DEFAULT gen_random_uuid()
    );
    CREATE TABLE IF NOT EXISTS "_articles_v_version_write_in_authors" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar,
      "photo_id" integer,
      "_uuid" varchar
    );

    DO $$ BEGIN
      ALTER TABLE "articles_write_in_authors"
        ADD CONSTRAINT "articles_write_in_authors_photo_id_media_id_fk"
        FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "articles_write_in_authors"
        ADD CONSTRAINT "articles_write_in_authors_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_articles_v_version_write_in_authors"
        ADD CONSTRAINT "_articles_v_version_write_in_authors_photo_id_media_id_fk"
        FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_articles_v_version_write_in_authors"
        ADD CONSTRAINT "_articles_v_version_write_in_authors_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "articles_write_in_authors_order_idx" ON "articles_write_in_authors" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "articles_write_in_authors_parent_id_idx" ON "articles_write_in_authors" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "articles_write_in_authors_photo_idx" ON "articles_write_in_authors" USING btree ("photo_id");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_write_in_authors_order_idx" ON "_articles_v_version_write_in_authors" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_write_in_authors_parent_id_idx" ON "_articles_v_version_write_in_authors" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_write_in_authors_photo_idx" ON "_articles_v_version_write_in_authors" USING btree ("photo_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "_articles_v_version_write_in_authors";
    DROP TABLE IF EXISTS "articles_write_in_authors";
  `)
}
