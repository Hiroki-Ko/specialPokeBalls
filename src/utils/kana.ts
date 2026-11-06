/**
 * ひらがな入力でもカタカナ表記のポケモン名等を検索できるようにするための正規化ユーティリティ。
 * ポケモン名・ボール名はすべてカタカナで保持しているため、比較前に双方をカタカナへ揃える。
 */

/** ひらがな(U+3041-3096)をカタカナへ変換する。それ以外の文字はそのまま */
export function hiraganaToKatakana(input: string): string {
  return input.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
}

/** ひらがな・カタカナを区別せず(カタカナに正規化して)部分一致するかどうかを判定する */
export function kanaIncludes(haystack: string, needle: string): boolean {
  if (!needle) return true
  return hiraganaToKatakana(haystack).includes(hiraganaToKatakana(needle))
}

/** 名前順の「ア行/カ行/…」ジャンプ用。行の見出し(先頭に来るカタカナ1文字) */
export type KanaRow = 'ア' | 'カ' | 'サ' | 'タ' | 'ナ' | 'ハ' | 'マ' | 'ヤ' | 'ラ' | 'ワ' | '他'

const KANA_ROW_CHARS: [KanaRow, string][] = [
  ['ア', 'アイウエオァィゥェォ'],
  ['カ', 'カキクケコヵヶ'],
  ['サ', 'サシスセソ'],
  ['タ', 'タチツテトッ'],
  ['ナ', 'ナニヌネノ'],
  ['ハ', 'ハヒフヘホ'],
  ['マ', 'マミムメモ'],
  ['ヤ', 'ヤユヨャュョ'],
  ['ラ', 'ラリルレロ'],
  ['ワ', 'ワヲンヮ'],
]

/**
 * 文字列の先頭文字が五十音のどの行に属するかを返す。
 * ひらがなはカタカナへ、濁音・半濁音(ガ→カ、パ→ハ、ヴ→ウ)は清音へ正規化して判定する。
 * かな以外(英数字・記号・長音など)で始まる場合は '他' を返す。
 */
export function kanaRowOf(name: string): KanaRow {
  const first = hiraganaToKatakana(name.trim()).charAt(0)
  if (!first) return '他'
  // NFDで濁点・半濁点を分離し、ベース文字(清音)だけを取り出す
  const base = first.normalize('NFD').charAt(0)
  for (const [row, chars] of KANA_ROW_CHARS) {
    if (chars.includes(base)) return row
  }
  return '他'
}
