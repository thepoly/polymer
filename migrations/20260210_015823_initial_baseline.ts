import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  // Baseline migration - intentional no-op
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  // Baseline migration - intentional no-op
}