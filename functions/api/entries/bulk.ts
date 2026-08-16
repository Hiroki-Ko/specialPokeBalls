// POST /api/entries/bulk
// 複数件まとめて登録する(BulkRegisterModalの一括登録に対応)。
// entries/index.ts と同様、id・createdAt・ballStatusesはクライアント側で決定済みのものを受け取る。

interface Env {
  DB: D1Database
}

interface EntryBody {
  id: string
  pokemonId: string
  note: string | null
  createdAt: string
  ballStatuses: { ballType: string; status: string }[]
}

interface BulkBody {
  entries?: EntryBody[]
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env
  const body = (await context.request.json()) as BulkBody
  const entries = body.entries ?? []

  if (entries.length === 0) {
    return Response.json({ error: 'entries is required' }, { status: 400 })
  }

  const statements = []
  for (const entry of entries) {
    statements.push(
      DB.prepare('INSERT INTO entries (id, pokemon_id, note, created_at) VALUES (?, ?, ?, ?)').bind(
        entry.id,
        entry.pokemonId,
        entry.note ?? null,
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

  return Response.json({ ok: true }, { status: 201 })
}
