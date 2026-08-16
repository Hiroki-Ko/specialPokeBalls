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
