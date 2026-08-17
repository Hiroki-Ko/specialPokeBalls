-- Cloudflare D1 スキーマ。
-- 適用方法:
--   ローカル動作確認: wrangler d1 execute DB --local --file=schema.sql
--   本番(Cloudflare上のD1)への適用: wrangler d1 execute DB --remote --file=schema.sql

-- 1ポケモン(pokemon_id)につき実エントリは最大1件の前提(マスタ全種をデフォルト表示し、
-- 未登録分は仮想的に「全ボール未入手」として扱う仕様のため)。UNIQUE制約で二重登録を防ぐ。
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  pokemon_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_pokemon_id ON entries(pokemon_id);

-- オシャボ(ボール)ごとの入手状況。entriesに対して1行1ボールで持つ。
-- (D1側では外部キーのON DELETE CASCADEに頼らず、entries削除時はAPI側で明示的に削除する)
CREATE TABLE IF NOT EXISTS ball_statuses (
  entry_id TEXT NOT NULL,
  ball_type TEXT NOT NULL,
  status TEXT NOT NULL,
  PRIMARY KEY (entry_id, ball_type)
);

CREATE INDEX IF NOT EXISTS idx_ball_statuses_entry_id ON ball_statuses(entry_id);

-- PokéAPIの第7世代以降データ欠落を補う、手動登録したゲームタイトルの内定情報
CREATE TABLE IF NOT EXISTS title_overrides (
  title TEXT NOT NULL,
  pokemon_id TEXT NOT NULL,
  PRIMARY KEY (title, pokemon_id)
);

-- ポケモンマスタ(参照専用データ)。scripts/generate-pokemon-master.mjs で生成したJSONを
-- scripts/seed-pokemon-master.mjs でこのテーブルへ流し込む(npm run d1:seed-master:local / :remote)。
-- eggGroups・gameTitlesはJSON配列文字列としてそのまま保存する。
CREATE TABLE IF NOT EXISTS pokemon_master (
  id TEXT PRIMARY KEY,
  national_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  form_name TEXT,
  egg_groups TEXT NOT NULL,
  hatch_steps INTEGER NOT NULL,
  hidden_ability TEXT,
  game_titles TEXT NOT NULL,
  -- 基本的に数値だが、色違いなどPokéAPI上「フォルム」扱いのものは
  -- 「669-yellow」のような文字列IDになる場合があるためTEXTとする
  -- (SQLiteの型アフィニティ上、数値のみのIDでも問題なく格納できる)。
  sprite_id TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pokemon_master_national_no ON pokemon_master(national_no);
