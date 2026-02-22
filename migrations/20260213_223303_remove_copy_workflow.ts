import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "articles" DROP CONSTRAINT "articles_copy_editor1_id_users_id_fk";
  
  ALTER TABLE "articles" DROP CONSTRAINT "articles_copy_editor2_id_users_id_fk";
  
  ALTER TABLE "articles" DROP CONSTRAINT "articles_copy_editor3_id_users_id_fk";
  
  ALTER TABLE "_articles_v" DROP CONSTRAINT "_articles_v_version_copy_editor1_id_users_id_fk";
  
  ALTER TABLE "_articles_v" DROP CONSTRAINT "_articles_v_version_copy_editor2_id_users_id_fk";
  
  ALTER TABLE "_articles_v" DROP CONSTRAINT "_articles_v_version_copy_editor3_id_users_id_fk";
  
  DELETE FROM "users_roles" WHERE "value" = 'copy-editor';

  ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_users_roles";
  CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'eic', 'editor', 'writer');
  ALTER TABLE "users_roles" ALTER COLUMN "value" SET DATA TYPE "public"."enum_users_roles" USING "value"::"public"."enum_users_roles";
  DROP INDEX "articles_copy_editor1_idx";
  DROP INDEX "articles_copy_editor2_idx";
  DROP INDEX "articles_copy_editor3_idx";
  DROP INDEX "_articles_v_version_version_copy_editor1_idx";
  DROP INDEX "_articles_v_version_version_copy_editor2_idx";
  DROP INDEX "_articles_v_version_version_copy_editor3_idx";
  ALTER TABLE "articles" DROP COLUMN "status";
  ALTER TABLE "articles" DROP COLUMN "copy_editor1_id";
  ALTER TABLE "articles" DROP COLUMN "copy_editor2_id";
  ALTER TABLE "articles" DROP COLUMN "copy_editor3_id";
  ALTER TABLE "_articles_v" DROP COLUMN "version_status";
  ALTER TABLE "_articles_v" DROP COLUMN "version_copy_editor1_id";
  ALTER TABLE "_articles_v" DROP COLUMN "version_copy_editor2_id";
  ALTER TABLE "_articles_v" DROP COLUMN "version_copy_editor3_id";
  DROP TYPE "public"."article_status_enum";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."article_status_enum" AS ENUM('draft', 'needs-copy', 'needs-1st', 'needs-2nd', 'needs-3rd', 'ready');
  ALTER TYPE "public"."enum_users_roles" ADD VALUE 'copy-editor' BEFORE 'editor';
  ALTER TABLE "articles" ADD COLUMN "status" "article_status_enum" DEFAULT 'draft';
  ALTER TABLE "articles" ADD COLUMN "copy_editor1_id" integer;
  ALTER TABLE "articles" ADD COLUMN "copy_editor2_id" integer;
  ALTER TABLE "articles" ADD COLUMN "copy_editor3_id" integer;
  ALTER TABLE "_articles_v" ADD COLUMN "version_status" "article_status_enum" DEFAULT 'draft';
  ALTER TABLE "_articles_v" ADD COLUMN "version_copy_editor1_id" integer;
  ALTER TABLE "_articles_v" ADD COLUMN "version_copy_editor2_id" integer;
  ALTER TABLE "_articles_v" ADD COLUMN "version_copy_editor3_id" integer;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_copy_editor1_id_users_id_fk" FOREIGN KEY ("copy_editor1_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_copy_editor2_id_users_id_fk" FOREIGN KEY ("copy_editor2_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "articles" ADD CONSTRAINT "articles_copy_editor3_id_users_id_fk" FOREIGN KEY ("copy_editor3_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_copy_editor1_id_users_id_fk" FOREIGN KEY ("version_copy_editor1_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_copy_editor2_id_users_id_fk" FOREIGN KEY ("version_copy_editor2_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_articles_v" ADD CONSTRAINT "_articles_v_version_copy_editor3_id_users_id_fk" FOREIGN KEY ("version_copy_editor3_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "articles_copy_editor1_idx" ON "articles" USING btree ("copy_editor1_id");
  CREATE INDEX "articles_copy_editor2_idx" ON "articles" USING btree ("copy_editor2_id");
  CREATE INDEX "articles_copy_editor3_idx" ON "articles" USING btree ("copy_editor3_id");
  CREATE INDEX "_articles_v_version_version_copy_editor1_idx" ON "_articles_v" USING btree ("version_copy_editor1_id");
  CREATE INDEX "_articles_v_version_version_copy_editor2_idx" ON "_articles_v" USING btree ("version_copy_editor2_id");
  CREATE INDEX "_articles_v_version_version_copy_editor3_idx" ON "_articles_v" USING btree ("version_copy_editor3_id");`)
}
