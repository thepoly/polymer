import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "layout" ADD COLUMN "top4_id" integer;
  ALTER TABLE "layout" ADD CONSTRAINT "layout_top4_id_articles_id_fk" FOREIGN KEY ("top4_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "layout_top4_idx" ON "layout" USING btree ("top4_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "layout" DROP CONSTRAINT "layout_top4_id_articles_id_fk";
  
  DROP INDEX "layout_top4_idx";
  ALTER TABLE "layout" DROP COLUMN "top4_id";`)
}
