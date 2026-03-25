-- 20260324: Add Roles collection and migrate user roles
CREATE TABLE IF NOT EXISTS "roles" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL,
  "color" varchar,
  "permissions_admin" boolean,
  "permissions_manage_users" boolean,
  "permissions_manage_articles" boolean,
  "permissions_publish_articles" boolean,
  "permissions_manage_section_articles" boolean,
  "permissions_manage_layout" boolean,
  "permissions_manage_submissions" boolean,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "roles_name_idx" ON "roles" USING btree ("name");

CREATE TABLE IF NOT EXISTS "users_rels" (
  "id" serial PRIMARY KEY NOT NULL,
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" varchar NOT NULL,
  "roles_id" integer
);
CREATE INDEX IF NOT EXISTS "users_rels_order_idx" ON "users_rels" USING btree ("order");
CREATE INDEX IF NOT EXISTS "users_rels_parent_idx" ON "users_rels" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "users_rels_path_idx" ON "users_rels" USING btree ("path");
CREATE INDEX IF NOT EXISTS "users_rels_roles_id_idx" ON "users_rels" USING btree ("roles_id");
DO $$ BEGIN
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE "users_rels" ADD CONSTRAINT "users_rels_roles_fk" FOREIGN KEY ("roles_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "merged_permissions" jsonb;

-- Seed default roles
INSERT INTO "roles" ("name", "permissions_admin") VALUES ('admin', true) ON CONFLICT DO NOTHING;
INSERT INTO "roles" ("name", "permissions_manage_users", "permissions_manage_articles", "permissions_publish_articles", "permissions_manage_layout", "permissions_manage_submissions") 
VALUES ('eic', true, true, true, true, true) ON CONFLICT DO NOTHING;
INSERT INTO "roles" ("name", "permissions_manage_section_articles", "permissions_publish_articles", "permissions_manage_layout") 
VALUES ('editor', true, true, true) ON CONFLICT DO NOTHING;
INSERT INTO "roles" ("name") VALUES ('writer') ON CONFLICT DO NOTHING;

-- Migrate data from users_roles to users_rels
INSERT INTO "users_rels" ("order", "parent_id", "path", "roles_id")
SELECT ur."order", ur."parent_id", 'roles', r."id"
FROM "users_roles" ur
JOIN "roles" r ON r."name" = ur."value"::text
WHERE NOT EXISTS (
  SELECT 1 FROM "users_rels" ur2 
  WHERE ur2."parent_id" = ur."parent_id" 
  AND ur2."roles_id" = r."id"
);

-- Update merged_permissions for users based on their new roles
UPDATE "users" u
SET "merged_permissions" = (
  SELECT jsonb_build_object(
    'admin', bool_or("permissions_admin" = true),
    'manageUsers', bool_or("permissions_manage_users" = true),
    'manageArticles', bool_or("permissions_manage_articles" = true),
    'publishArticles', bool_or("permissions_publish_articles" = true),
    'manageSectionArticles', bool_or("permissions_manage_section_articles" = true),
    'manageLayout', bool_or("permissions_manage_layout" = true),
    'manageSubmissions', bool_or("permissions_manage_submissions" = true)
  )
  FROM "users_rels" ur
  JOIN "roles" r ON r."id" = ur."roles_id"
  WHERE ur."parent_id" = u."id"
)
WHERE "merged_permissions" IS NULL OR "merged_permissions" = '{}'::jsonb;