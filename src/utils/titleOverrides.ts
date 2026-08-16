import type { PokemonMaster } from '../types'

/**
 * ④対応: PokéAPI側のロケーションエリア出現データが第7世代以降で不足しているため、
 * 「タイトルを選択 → そのタイトルに内定しているポケモンを選択・登録」という手順で
 * 手動補完した内定情報。
 *
 * ポケモンマスタ本体(pokemonMaster.json)は書き換えず、Cloudflare D1の
 * title_overrides テーブルに「タイトル名 -> 手動で内定と判断したポケモンIDの配列」として
 * 重ねて保存する(読み書き自体は src/utils/api.ts の fetchState / apiSaveTitleOverrideMembers)。
 * 表示・絞り込みでは、マスタのgameTitlesとここでの登録内容を合算して扱う。
 */
export type TitleOverrides = Record<string, string[]>

/** 指定タイトルの手動登録メンバーを丸ごと置き換える(空配列ならキー自体を削除する)。ローカルstate更新用の純粋関数 */
export function setTitleMembers(
  overrides: TitleOverrides,
  title: string,
  pokemonIds: string[],
): TitleOverrides {
  const next = { ...overrides }
  if (pokemonIds.length === 0) {
    delete next[title]
  } else {
    next[title] = pokemonIds
  }
  return next
}

/** マスタのgameTitlesと手動登録分を合算した、実際に絞り込み等で使うタイトル一覧 */
export function getEffectiveGameTitles(pokemon: PokemonMaster, overrides: TitleOverrides): string[] {
  const extra = Object.entries(overrides)
    .filter(([, ids]) => ids.includes(pokemon.id))
    .map(([title]) => title)
  if (extra.length === 0) return pokemon.gameTitles
  return [...new Set([...pokemon.gameTitles, ...extra])]
}
