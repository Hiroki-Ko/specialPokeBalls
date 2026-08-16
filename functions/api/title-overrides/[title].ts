// PUT /api/title-overrides/:title
// 指定タイトルの手動登録メンバー(内定ポケモンID一覧)を丸ごと置き換える。
// pokemonIdsが空配列の場合はそのタイトルの登録を全て削除する。

interface Env {
  DB: D1Database
}

interface PutBody {
  pokemonIds?: string[]
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { DB } = context.env
  const title = decodeURIComponent(context.params.title as string)
  const body = (await context.request.json()) as PutBody
  const pokemonIds = body.pokemonIds ?? []

  const statements = [DB.prepare('DELETE FROM title_overrides WHERE title = ?').bind(title)]
  for (const pokemonId of pokemonIds) {
    statements.push(
      DB.prepare('INSERT INTO title_overrides (title, pokemon_id) VALUES (?, ?)').bind(title, pokemonId),
    )
  }
  await DB.batch(statements)

  return Response.json({ ok: true })
}
