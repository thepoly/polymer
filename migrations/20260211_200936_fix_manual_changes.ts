import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "layout" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar DEFAULT 'Main Front Page Layout' NOT NULL,
  	"main_article_id" integer NOT NULL,
  	"top1_id" integer,
  	"top2_id" integer,
  	"top3_id" integer,
  	"op1_id" integer,
  	"op2_id" integer,
  	"op3_id" integer,
  	"op4_id" integer,
  	"special_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "layout_id" integer;
  ALTER TABLE "layout" ADD CONSTRAINT "layout_main_article_id_articles_id_fk" FOREIGN KEY ("main_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layout" ADD CONSTRAINT "layout_top1_id_articles_id_fk" FOREIGN KEY ("top1_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layout" ADD CONSTRAINT "layout_top2_id_articles_id_fk" FOREIGN KEY ("top2_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layout" ADD CONSTRAINT "layout_top3_id_articles_id_fk" FOREIGN KEY ("top3_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layout" ADD CONSTRAINT "layout_op1_id_articles_id_fk" FOREIGN KEY ("op1_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layout" ADD CONSTRAINT "layout_op2_id_articles_id_fk" FOREIGN KEY ("op2_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layout" ADD CONSTRAINT "layout_op3_id_articles_id_fk" FOREIGN KEY ("op3_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layout" ADD CONSTRAINT "layout_op4_id_articles_id_fk" FOREIGN KEY ("op4_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "layout" ADD CONSTRAINT "layout_special_id_articles_id_fk" FOREIGN KEY ("special_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "layout_main_article_idx" ON "layout" USING btree ("main_article_id");
  CREATE INDEX "layout_top1_idx" ON "layout" USING btree ("top1_id");
  CREATE INDEX "layout_top2_idx" ON "layout" USING btree ("top2_id");
  CREATE INDEX "layout_top3_idx" ON "layout" USING btree ("top3_id");
  CREATE INDEX "layout_op1_idx" ON "layout" USING btree ("op1_id");
  CREATE INDEX "layout_op2_idx" ON "layout" USING btree ("op2_id");
  CREATE INDEX "layout_op3_idx" ON "layout" USING btree ("op3_id");
  CREATE INDEX "layout_op4_idx" ON "layout" USING btree ("op4_id");
  CREATE INDEX "layout_special_idx" ON "layout" USING btree ("special_id");
  CREATE INDEX "layout_updated_at_idx" ON "layout" USING btree ("updated_at");
  CREATE INDEX "layout_created_at_idx" ON "layout" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_layout_fk" FOREIGN KEY ("layout_id") REFERENCES "public"."layout"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_layout_id_idx" ON "payload_locked_documents_rels" USING btree ("layout_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "layout" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "layout" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_layout_fk";
  
  DROP INDEX "payload_locked_documents_rels_layout_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "layout_id";`)
}
