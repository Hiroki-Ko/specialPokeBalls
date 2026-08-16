// GET /api/pokemon-master
// アプリ起動時にstate取得と並行して呼び、ポケモンマスタ(図鑑データ)を取得する。
// 内容自体はユーザーが変更しない参照専用データ(scripts/generate-pokemon-master.mjs で生成し、
// scripts/seed-pokemon-master.mjs でD1に投入したもの)。

interface Env {
  DB: D1Database
}

interface PokemonMasterRow {
  id: string
  national_no: number
  name: string
  form_name: string | null
  egg_groups: string
  hatch_steps: number
  hidden_ability: string | null
  game_titles: string
  sprite_id: number
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { DB } = context.env

  const result = await DB.prepare(
    'SELECT id, national_no, name, form_name, egg_groups, hatch_steps, hidden_ability, game_titles, sprite_id FROM pokemon_master ORDER BY national_no ASC, id ASC',
  ).all<PokemonMasterRow>()

  const data = result.results.map((row) => ({
    id: row.id,
    nationalNo: row.national_no,
    name: row.name,
    formName: row.form_name,
    eggGroups: JSON.parse(row.egg_groups) as string[],
    hatchSteps: row.hatch_steps,
    hiddenAbility: row.hidden_ability,
    gameTitles: JSON.parse(row.game_titles) as string[],
    spriteId: row.sprite_id,
  }))

  return Response.json(data)
}
