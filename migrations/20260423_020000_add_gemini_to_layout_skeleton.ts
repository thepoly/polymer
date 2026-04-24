import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Note: `version_skeleton` on `_layout_v` is a varchar (not an enum), so no
  // shadow enum update is required. Only the base `enum_layout_skeleton` exists.
  await db.execute(sql`
    ALTER TYPE "public"."enum_layout_skeleton" ADD VALUE IF NOT EXISTS 'gemini';
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // PostgreSQL does not support removing values from enums directly.
  // No-op on down — recreating the enum would require rewriting the column.
}
