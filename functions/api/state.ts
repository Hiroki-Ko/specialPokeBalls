// GET /api/state
// アプリ起動時に一度だけ呼び、オシャボ登録データとゲームタイトル手動登録情報を
// まとめて取得する。

interface Env {
  DB: D1Database
}

interface EntryRow {
  id: string
  pokemon_id: string
  note: string | null
  created_at: string
}

interface BallStatusRow {
  entry_id: string
  ball_type: string
  status: string
}

interface TitleOverrideRow {
  title: string
  pokemon_id: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env

  const [entriesResult, ballRowsResult, overrideRowsResult] = await Promise.all([
    DB.prepare('SELECT id, pokemon_id, note, created_at FROM entries ORDER BY created_at ASC, rowid ASC').all<EntryRow>(),
    DB.prepare('SELECT entry_id, ball_type, status FROM ball_statuses').all<BallStatusRow>(),
    DB.prepare('SELECT title, pokemon_id FROM title_overrides').all<TitleOverrideRow>(),
  ])

  const ballsByEntry = new Map<string, { ballType: string; status: string }[]>()
  for (const row of ballRowsResult.results) {
    const list = ballsByEntry.get(row.entry_id) ?? []
    list.push({ ballType: row.ball_type, status: row.status })
    ballsByEntry.set(row.entry_id, list)
  }

  const entries = entriesResult.results.map((row) => ({
    id: row.id,
    pokemonId: row.pokemon_id,
    note: row.note,
    createdAt: row.created_at,
    ballStatuses: ballsByEntry.get(row.id) ?? [],
  }))

  const titleOverrides: Record<string, string[]> = {}
  for (const row of overrideRowsResult.results) {
    if (!titleOverrides[row.title]) titleOverrides[row.title] = []
    titleOverrides[row.title].push(row.pokemon_id)
  }

  return Response.json({ entries, titleOverrides })
}
