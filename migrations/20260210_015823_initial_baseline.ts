import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({}: MigrateUpArgs): Promise<void> {
  // Baseline migration - intentional no-op
}

export async function down({}: MigrateDownArgs): Promise<void> {
  // Baseline migration - intentional no-op
}