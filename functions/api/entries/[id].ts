// PATCH /api/entries/:id  — メモ・対象ポケモン・オシャボ入手状況の部分更新
// DELETE /api/entries/:id — 削除

interface Env {
  DB: D1Database
}

interface UpdateEntryBody {
  pokemonId?: string
  note?: string | null
  ballStatuses?: { ballType: string; status: string }[]
}

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { DB } = context.env
  const id = context.params.id as string
  const body = (await context.request.json()) as UpdateEntryBody

  const statements = []

  const sets: string[] = []
  const values: unknown[] = []
  if (body.pokemonId !== undefined) {
    sets.push('pokemon_id = ?')
    values.push(body.pokemonId)
  }
  if (body.note !== undefined) {
    sets.push('note = ?')
    values.push(body.note)
  }
  if (sets.length > 0) {
    values.push(id)
    statements.push(DB.prepare(`UPDATE entries SET ${sets.join(', ')} WHERE id = ?`).bind(...values))
  }

  if (body.ballStatuses) {
    for (const bs of body.ballStatuses) {
      statements.push(
        DB.prepare('UPDATE ball_statuses SET status = ? WHERE entry_id = ? AND ball_type = ?').bind(
          bs.status,
          id,
          bs.ballType,
        ),
      )
    }
  }

  if (statements.length > 0) {
    await DB.batch(statements)
  }

  return Response.json({ ok: true })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { DB } = context.env
  const id = context.params.id as string

  await DB.batch([
    DB.prepare('DELETE FROM ball_statuses WHERE entry_id = ?').bind(id),
    DB.prepare('DELETE FROM entries WHERE id = ?').bind(id),
  ])

  return Response.json({ ok: true })
}
