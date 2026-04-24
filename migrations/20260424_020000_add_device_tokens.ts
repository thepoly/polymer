import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Create the `device_tokens` table backing the DeviceTokens collection.
 * Holds FCM tokens registered by the mobile app for push notifications.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_device_tokens_platform" AS ENUM('android', 'ios');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE TABLE IF NOT EXISTS "device_tokens" (
      "id" serial PRIMARY KEY NOT NULL,
      "token" varchar NOT NULL,
      "platform" "public"."enum_device_tokens_platform" DEFAULT 'android' NOT NULL,
      "last_seen_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "device_tokens_token_idx" ON "device_tokens" USING btree ("token");
    CREATE INDEX IF NOT EXISTS "device_tokens_created_at_idx" ON "device_tokens" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "device_tokens_updated_at_idx" ON "device_tokens" USING btree ("updated_at");

    ALTER TABLE "payload_locked_documents_rels"
      ADD COLUMN IF NOT EXISTS "device_tokens_id" integer;

    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels"
        ADD CONSTRAINT "payload_locked_documents_rels_device_tokens_fk"
        FOREIGN KEY ("device_tokens_id") REFERENCES "public"."device_tokens"("id")
        ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;

    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_device_tokens_id_idx"
      ON "payload_locked_documents_rels" ("device_tokens_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels"
      DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_device_tokens_fk";
    DROP INDEX IF EXISTS "payload_locked_documents_rels_device_tokens_id_idx";
    ALTER TABLE "payload_locked_documents_rels"
      DROP COLUMN IF EXISTS "device_tokens_id";
    DROP TABLE IF EXISTS "device_tokens";
    DROP TYPE IF EXISTS "public"."enum_device_tokens_platform";
  `)
}
