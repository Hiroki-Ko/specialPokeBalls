import { POKEMON_MASTER, displayName } from './pokemon'
import type { PokemonMaster } from '../types'

export interface BulkParseSuccess {
  line: string
  pokemon: PokemonMaster
}

export interface BulkParseSkip {
  line: string
  reason: string
}

export interface BulkParseResult {
  successes: BulkParseSuccess[]
  skipped: BulkParseSkip[]
}

/**
 * 3.1.2 一括登録の入力(1行「全国No.,フォルム」)をパースし、
 * ポケモンマスタと照合してポケモンを解決する。
 */
export function parseBulkInput(text: string): BulkParseResult {
  const successes: BulkParseSuccess[] = []
  const skipped: BulkParseSkip[] = []

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  for (const line of lines) {
    const [noRaw, formRaw] = line.split(',').map((s) => s?.trim() ?? '')
    const nationalNo = Number(noRaw)

    if (!noRaw || Number.isNaN(nationalNo)) {
      skipped.push({ line, reason: '全国No.が数値として読み取れません' })
      continue
    }

    const candidates = POKEMON_MASTER.filter((p) => p.nationalNo === nationalNo)
    if (candidates.length === 0) {
      skipped.push({ line, reason: `全国No.${nationalNo}はポケモンマスタに存在しません` })
      continue
    }

    let matched: PokemonMaster | undefined
    if (!formRaw) {
      matched = candidates.find((p) => p.formName === null)
    } else {
      matched = candidates.find((p) => p.formName === formRaw)
    }

    if (!matched) {
      skipped.push({
        line,
        reason: formRaw
          ? `全国No.${nationalNo}に「${formRaw}」というフォルムは見つかりません`
          : `全国No.${nationalNo}の基本フォルムが見つかりません`,
      })
      continue
    }

    successes.push({ line, pokemon: matched })
  }

  return { successes, skipped }
}

/**
 * 3.1.2 一括登録(全国No.範囲版)。
 * 生成済みのポケモンマスタ(pokemonMaster.json)から、指定した全国No.の範囲に該当する
 * ポケモン(リージョンフォーム等の派生を含む)をすべて抽出する。1件ずつ手入力する必要がなく、
 * 新タイトル発売時にまとめて追加したい場合を想定した機能。
 * 既に登録済み(registeredIdsに含まれる)のポケモンは重複登録しないようスキップする。
 */
export function parseBulkRange(
  start: number,
  end: number,
  registeredIds: ReadonlySet<string>,
): BulkParseResult {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { successes: [], skipped: [{ line: '-', reason: '開始・終了の全国No.を正しく指定してください' }] }
  }

  const lo = Math.min(start, end)
  const hi = Math.max(start, end)

  const candidates = POKEMON_MASTER.filter((p) => p.nationalNo >= lo && p.nationalNo <= hi).sort(
    (a, b) => a.nationalNo - b.nationalNo || a.id.localeCompare(b.id),
  )

  const successes: BulkParseSuccess[] = []
  const skipped: BulkParseSkip[] = []

  for (const p of candidates) {
    const line = `No.${p.nationalNo} ${displayName(p)}`
    if (registeredIds.has(p.id)) {
      skipped.push({ line, reason: '既に登録済み' })
      continue
    }
    successes.push({ line, pokemon: p })
  }

  return { successes, skipped }
}
