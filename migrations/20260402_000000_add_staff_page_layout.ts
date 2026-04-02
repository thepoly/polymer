import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "major" varchar;

    CREATE TABLE IF NOT EXISTS "staff_page_layout" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL DEFAULT 'Staff Page Layout',
      "hero_left_id" integer,
      "hero_right_id" integer,
      "column_left_lead_id" integer,
      "column_left_support_id" integer,
      "column_right_lead_id" integer,
      "column_right_support_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "staff_page_layout"
        ADD CONSTRAINT "staff_page_layout_hero_left_id_users_id_fk"
        FOREIGN KEY ("hero_left_id") REFERENCES "public"."users"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "staff_page_layout"
        ADD CONSTRAINT "staff_page_layout_hero_right_id_users_id_fk"
        FOREIGN KEY ("hero_right_id") REFERENCES "public"."users"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "staff_page_layout"
        ADD CONSTRAINT "staff_page_layout_column_left_lead_id_users_id_fk"
        FOREIGN KEY ("column_left_lead_id") REFERENCES "public"."users"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "staff_page_layout"
        ADD CONSTRAINT "staff_page_layout_column_left_support_id_users_id_fk"
        FOREIGN KEY ("column_left_support_id") REFERENCES "public"."users"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "staff_page_layout"
        ADD CONSTRAINT "staff_page_layout_column_right_lead_id_users_id_fk"
        FOREIGN KEY ("column_right_lead_id") REFERENCES "public"."users"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "staff_page_layout"
        ADD CONSTRAINT "staff_page_layout_column_right_support_id_users_id_fk"
        FOREIGN KEY ("column_right_support_id") REFERENCES "public"."users"("id")
        ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "staff_page_layout_hero_left_idx"
      ON "staff_page_layout" USING btree ("hero_left_id");
    CREATE INDEX IF NOT EXISTS "staff_page_layout_hero_right_idx"
      ON "staff_page_layout" USING btree ("hero_right_id");
    CREATE INDEX IF NOT EXISTS "staff_page_layout_column_left_lead_idx"
      ON "staff_page_layout" USING btree ("column_left_lead_id");
    CREATE INDEX IF NOT EXISTS "staff_page_layout_column_left_support_idx"
      ON "staff_page_layout" USING btree ("column_left_support_id");
    CREATE INDEX IF NOT EXISTS "staff_page_layout_column_right_lead_idx"
      ON "staff_page_layout" USING btree ("column_right_lead_id");
    CREATE INDEX IF NOT EXISTS "staff_page_layout_column_right_support_idx"
      ON "staff_page_layout" USING btree ("column_right_support_id");
    CREATE INDEX IF NOT EXISTS "staff_page_layout_created_at_idx"
      ON "staff_page_layout" USING btree ("created_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "staff_page_layout_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_staff_page_layout_fk"
        FOREIGN KEY ("staff_page_layout_id") REFERENCES "public"."staff_page_layout"("id")
        ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_staff_page_layout_id_idx"
      ON "payload_locked_documents_rels" ("staff_page_layout_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "staff_page_layout_id";

    DROP TABLE IF EXISTS "staff_page_layout";

    ALTER TABLE "users"
      DROP COLUMN IF EXISTS "major";
  `)
}
