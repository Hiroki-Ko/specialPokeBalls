// POST /api/entries
// 新規に1件だけ登録する(RegisterModalの単体登録に対応)。
// id・createdAt・ballStatusesの初期値はクライアント側(App.tsxのcreateEntry)で決定し、
// ここではそのまま保存するだけにする(既存の「即座に画面へ反映される」体験を変えないため)。

interface Env {
  DB: D1Database
}

interface EntryBody {
  id?: string
  pokemonId?: string
  note?: string | null
  createdAt?: string
  ballStatuses?: { ballType: string; status: string }[]
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { DB } = context.env
  const body = (await context.request.json()) as EntryBody

  if (!body.id || !body.pokemonId || !body.createdAt) {
    return Response.json({ error: 'id, pokemonId, createdAt are required' }, { status: 400 })
  }

  const statements = [
    DB.prepare('INSERT INTO entries (id, pokemon_id, note, created_at) VALUES (?, ?, ?, ?)').bind(
      body.id,
      body.pokemonId,
      body.note ?? null,
      body.createdAt,
    ),
    ...(body.ballStatuses ?? []).map((bs) =>
      DB.prepare('INSERT INTO ball_statuses (entry_id, ball_type, status) VALUES (?, ?, ?)').bind(
        body.id,
        bs.ballType,
        bs.status,
      ),
    ),
  ]
  await DB.batch(statements)

  return Response.json({ ok: true }, { status: 201 })
}
