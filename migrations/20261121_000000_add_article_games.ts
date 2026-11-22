import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_articles_games_home_away" AS ENUM('home', 'away', 'neutral');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__articles_v_version_games_home_away" AS ENUM('home', 'away', 'neutral');
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    CREATE TABLE IF NOT EXISTS "articles_games" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "opponent_id" integer,
      "date" timestamp(3) with time zone,
      "home_away" "enum_articles_games_home_away" DEFAULT 'home',
      "rpi_score" numeric,
      "opponent_score" numeric,
      "status" varchar
    );

    CREATE TABLE IF NOT EXISTS "_articles_v_version_games" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "opponent_id" integer,
      "date" timestamp(3) with time zone,
      "home_away" "enum__articles_v_version_games_home_away" DEFAULT 'home',
      "rpi_score" numeric,
      "opponent_score" numeric,
      "status" varchar,
      "_uuid" varchar
    );

    DO $$ BEGIN
      ALTER TABLE "articles_games" ADD CONSTRAINT "articles_games_opponent_id_schools_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "articles_games" ADD CONSTRAINT "articles_games_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "_articles_v_version_games" ADD CONSTRAINT "_articles_v_version_games_opponent_id_schools_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    DO $$ BEGIN
      ALTER TABLE "_articles_v_version_games" ADD CONSTRAINT "_articles_v_version_games_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_articles_v"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
    CREATE INDEX IF NOT EXISTS "articles_games_order_idx" ON "articles_games" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "articles_games_parent_id_idx" ON "articles_games" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "articles_games_opponent_idx" ON "articles_games" USING btree ("opponent_id");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_games_order_idx" ON "_articles_v_version_games" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_games_parent_id_idx" ON "_articles_v_version_games" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "_articles_v_version_games_opponent_idx" ON "_articles_v_version_games" USING btree ("opponent_id");

    -- Give the same legacy game a stable row ID in its live document and revisions.
    INSERT INTO articles_games (_order, _parent_id, id, opponent_id, home_away, rpi_score, opponent_score, status)
    SELECT 1, a.id, substr(md5('game:' || a.id), 1, 24), a.opponent_id,
      coalesce(a.home_away::text, 'home')::enum_articles_games_home_away, a.rpi_score, a.opponent_score, a.game_status
    FROM articles a
    WHERE a.section = 'sports' AND a.opponent_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM articles_games g WHERE g._parent_id = a.id);

    INSERT INTO _articles_v_version_games (_order, _parent_id, _uuid, opponent_id, home_away, rpi_score, opponent_score, status)
    SELECT 1, v.id, substr(md5('game:' || coalesce(v.parent_id, v.id)), 1, 24), v.version_opponent_id,
      coalesce(v.version_home_away::text, 'home')::enum__articles_v_version_games_home_away,
      v.version_rpi_score, v.version_opponent_score, v.version_game_status
    FROM _articles_v v
    WHERE v.version_section = 'sports' AND v.version_opponent_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM _articles_v_version_games g WHERE g._parent_id = v.id);
  `)
}

// The single-game schema can retain the first game of each story on rollback.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE articles a SET
      opponent_id = g.opponent_id, home_away = g.home_away::text::enum_articles_home_away,
      rpi_score = g.rpi_score, opponent_score = g.opponent_score, game_status = g.status
    FROM (SELECT DISTINCT ON (_parent_id) * FROM articles_games ORDER BY _parent_id, _order) g
    WHERE a.id = g._parent_id;
    UPDATE _articles_v a SET
      version_opponent_id = g.opponent_id, version_home_away = g.home_away::text::enum__articles_v_version_home_away,
      version_rpi_score = g.rpi_score, version_opponent_score = g.opponent_score, version_game_status = g.status
    FROM (SELECT DISTINCT ON (_parent_id) * FROM _articles_v_version_games ORDER BY _parent_id, _order) g
    WHERE a.id = g._parent_id;
    DROP TABLE _articles_v_version_games, articles_games;
    DROP TYPE enum__articles_v_version_games_home_away, enum_articles_games_home_away;
  `)
}
