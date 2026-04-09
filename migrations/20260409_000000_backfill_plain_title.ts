import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { getPlainText } from '../utils/getPlainText'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "plain_title" varchar;
    ALTER TABLE "_articles_v" ADD COLUMN IF NOT EXISTS "version_plain_title" varchar;
  `)

  const { rows } = await db.execute(sql`SELECT id, title FROM "articles" WHERE "title" IS NOT NULL`)
  
  for (const row of rows) {
    const plainTitle = getPlainText(row.title)
    await db.execute(sql`UPDATE "articles" SET "plain_title" = ${plainTitle} WHERE id = ${row.id}`)
  }

  const { rows: versionRows } = await db.execute(sql`SELECT id, version_title FROM "_articles_v" WHERE "version_title" IS NOT NULL`)
  
  for (const row of versionRows) {
    const plainTitle = getPlainText(row.version_title)
    await db.execute(sql`UPDATE "_articles_v" SET "version_plain_title" = ${plainTitle} WHERE id = ${row.id}`)
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" DROP COLUMN IF EXISTS "plain_title";
    ALTER TABLE "_articles_v" DROP COLUMN IF EXISTS "version_plain_title";
  `)
}