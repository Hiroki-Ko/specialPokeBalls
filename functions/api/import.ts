// POST /api/import
// エクスポートしたJSONバックアップからの一括インポート。既存のentries/ball_statusesを
// 全て置き換える(タイトル手動登録情報 title_overrides はインポート対象外、既存のまま維持)。

interface Env {
  DB: D1Database
}

interface ImportedEntry {
  id: string
  pokemonId: string
  note: string | null
  createdAt: string
  ballStatuses: { ballType: string; status: string }[]
}

interface ImportBody {
  entries?: ImportedEntry[]
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env
  const body = (await context.request.json()) as ImportBody
  const entries = body.entries ?? []

  const statements = [DB.prepare('DELETE FROM ball_statuses'), DB.prepare('DELETE FROM entries')]

  for (const entry of entries) {
    statements.push(
      DB.prepare('INSERT INTO entries (id, pokemon_id, note, created_at) VALUES (?, ?, ?, ?)').bind(
        entry.id,
        entry.pokemonId,
        entry.note,
        entry.createdAt,
      ),
    )
    for (const bs of entry.ballStatuses ?? []) {
      statements.push(
        DB.prepare('INSERT INTO ball_statuses (entry_id, ball_type, status) VALUES (?, ?, ?)').bind(
          entry.id,
          bs.ballType,
          bs.status,
        ),
      )
    }
  }

  await DB.batch(statements)

  return Response.json({ ok: true, count: entries.length })
}
