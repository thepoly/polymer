import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" RENAME COLUMN "title" TO "old_title";
    ALTER TABLE "articles" ADD COLUMN "title" jsonb;
    
    UPDATE "articles" 
    SET "title" = jsonb_build_object(
      'root', jsonb_build_object(
        'type', 'root',
        'format', '',
        'indent', 0,
        'version', 1,
        'direction', 'ltr',
        'children', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'format', '',
            'indent', 0,
            'version', 1,
            'direction', 'ltr',
            'children', jsonb_build_array(
              jsonb_build_object(
                'type', 'text',
                'format', 0,
                'mode', 'normal',
                'style', '',
                'text', "old_title",
                'version', 1
              )
            )
          )
        )
      )
    );
    
    ALTER TABLE "articles" ALTER COLUMN "title" SET NOT NULL;
    ALTER TABLE "articles" DROP COLUMN "old_title";

    ALTER TABLE "_articles_v" RENAME COLUMN "version_title" TO "old_version_title";
    ALTER TABLE "_articles_v" ADD COLUMN "version_title" jsonb;
    
    UPDATE "_articles_v" 
    SET "version_title" = jsonb_build_object(
      'root', jsonb_build_object(
        'type', 'root',
        'format', '',
        'indent', 0,
        'version', 1,
        'direction', 'ltr',
        'children', jsonb_build_array(
          jsonb_build_object(
            'type', 'paragraph',
            'format', '',
            'indent', 0,
            'version', 1,
            'direction', 'ltr',
            'children', jsonb_build_array(
              jsonb_build_object(
                'type', 'text',
                'format', 0,
                'mode', 'normal',
                'style', '',
                'text', "old_version_title",
                'version', 1
              )
            )
          )
        )
      )
    ) WHERE "old_version_title" IS NOT NULL;
    
    ALTER TABLE "_articles_v" DROP COLUMN "old_version_title";
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "articles" RENAME COLUMN "title" TO "rich_title";
    ALTER TABLE "articles" ADD COLUMN "title" varchar;
    
    UPDATE "articles" 
    SET "title" = "rich_title"->'root'->'children'->0->'children'->0->>'text';
    
    ALTER TABLE "articles" ALTER COLUMN "title" SET NOT NULL;
    ALTER TABLE "articles" DROP COLUMN "rich_title";

    ALTER TABLE "_articles_v" RENAME COLUMN "version_title" TO "rich_version_title";
    ALTER TABLE "_articles_v" ADD COLUMN "version_title" varchar;
    
    UPDATE "_articles_v" 
    SET "version_title" = "rich_version_title"->'root'->'children'->0->'children'->0->>'text'
    WHERE "rich_version_title" IS NOT NULL;
    
    ALTER TABLE "_articles_v" DROP COLUMN "rich_version_title";
  `)
}
