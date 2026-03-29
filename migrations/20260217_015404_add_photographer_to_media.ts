import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "photographer_id" integer;
  ALTER TABLE "media" ADD CONSTRAINT "media_photographer_id_users_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_photographer_idx" ON "media" USING btree ("photographer_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP CONSTRAINT "media_photographer_id_users_id_fk";
  
  DROP INDEX "media_photographer_idx";
  ALTER TABLE "media" DROP COLUMN "photographer_id";`)
}
