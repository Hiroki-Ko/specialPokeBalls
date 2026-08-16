-- Cloudflare D1 スキーマ。
-- 適用方法:
--   ローカル動作確認: wrangler d1 execute DB --local --file=schema.sql
--   本番(Cloudflare上のD1)への適用: wrangler d1 execute DB --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  pokemon_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

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
