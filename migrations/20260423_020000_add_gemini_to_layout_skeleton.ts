import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // In environments where the `skeleton` column is backed by a Postgres enum
  // (e.g. prod, because Payload schema-sync created it before we were on
  // migrations-only), add 'gemini' to the enum. In fresh environments (CI),
  // the column is a plain varchar and the enum doesn't exist — so only run
  // the ALTER TYPE when the enum actually exists. `version_skeleton` on
  // `_layout_v` is always a varchar, so no shadow enum update is needed.
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_layout_skeleton') THEN
        ALTER TYPE "public"."enum_layout_skeleton" ADD VALUE IF NOT EXISTS 'gemini';
      END IF;
    END $$;
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // PostgreSQL does not support removing values from enums directly.
  // No-op on down — recreating the enum would require rewriting the column.
}
