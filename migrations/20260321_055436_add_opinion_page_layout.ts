import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "opinion_page_layout" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar NOT NULL,
      "editors_choice_label" varchar,
      "editors_choice1_id" integer,
      "editors_choice2_id" integer,
      "editors_choice3_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "opinion_page_layout_quotes" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "text" varchar NOT NULL,
      "article_id" integer NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "opinion_page_layout" ADD CONSTRAINT "opinion_page_layout_editors_choice1_id_articles_id_fk" FOREIGN KEY ("editors_choice1_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "opinion_page_layout" ADD CONSTRAINT "opinion_page_layout_editors_choice2_id_articles_id_fk" FOREIGN KEY ("editors_choice2_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "opinion_page_layout" ADD CONSTRAINT "opinion_page_layout_editors_choice3_id_articles_id_fk" FOREIGN KEY ("editors_choice3_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "opinion_page_layout_quotes" ADD CONSTRAINT "opinion_page_layout_quotes_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "opinion_page_layout_quotes" ADD CONSTRAINT "opinion_page_layout_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."opinion_page_layout"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "opinion_page_layout_editors_choice1_idx" ON "opinion_page_layout" USING btree ("editors_choice1_id");
    CREATE INDEX IF NOT EXISTS "opinion_page_layout_editors_choice2_idx" ON "opinion_page_layout" USING btree ("editors_choice2_id");
    CREATE INDEX IF NOT EXISTS "opinion_page_layout_editors_choice3_idx" ON "opinion_page_layout" USING btree ("editors_choice3_id");
    CREATE INDEX IF NOT EXISTS "opinion_page_layout_created_at_idx" ON "opinion_page_layout" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "opinion_page_layout_quotes_order_idx" ON "opinion_page_layout_quotes" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "opinion_page_layout_quotes_parent_id_idx" ON "opinion_page_layout_quotes" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "opinion_page_layout_quotes_article_idx" ON "opinion_page_layout_quotes" USING btree ("article_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "opinion_page_layout_quotes";
    DROP TABLE IF EXISTS "opinion_page_layout";
  `)
}
