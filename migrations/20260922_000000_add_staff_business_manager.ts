import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Adds `staff_page_layout.business_manager_id`, a seventh senior-board slot on
 * /staff. Nullable, so existing layouts need no backfill.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "staff_page_layout" ADD COLUMN IF NOT EXISTS "business_manager_id" integer;
    DO $$ BEGIN
      ALTER TABLE "staff_page_layout" ADD CONSTRAINT "staff_page_layout_business_manager_id_users_id_fk"
        FOREIGN KEY ("business_manager_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    CREATE INDEX IF NOT EXISTS "staff_page_layout_business_manager_idx"
      ON "staff_page_layout" USING btree ("business_manager_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "staff_page_layout" DROP COLUMN IF EXISTS "business_manager_id";
  `)
}
