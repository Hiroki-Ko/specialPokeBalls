/**
 * ゲームタイトルの発売順(古い→新しい)。
 * scripts/generate-pokemon-master.mjs の VERSION_JA と同じ並び順を保つ(新タイトル追加時は両方を更新する)。
 * 絞り込みのプルダウン等、タイトルを発売順(降順=新しいものが上)に並べたい箇所で使う。
 */
export const GAME_TITLE_RELEASE_ORDER = [
  '赤',
  '緑',
  '青',
  'ピカチュウ',
  '金',
  '銀',
  'クリスタル',
  'ルビー',
  'サファイア',
  'エメラルド',
  'ファイアレッド',
  'リーフグリーン',
  'ダイヤモンド',
  'パール',
  'プラチナ',
  'ハートゴールド',
  'ソウルシルバー',
  'ブラック',
  'ホワイト',
  'ブラック2',
  'ホワイト2',
  'X',
  'Y',
  'オメガルビー',
  'アルファサファイア',
  'サン',
  'ムーン',
  'ウルトラサン',
  'ウルトラムーン',
  "Let's Go! ピカチュウ",
  "Let's Go! イーブイ",
  'ソード',
  'シールド',
  'ブリリアントダイヤモンド',
  'シャイニングパール',
  'Legends アルセウス',
  'スカーレット',
  'バイオレット',
  'Legends ZA',
  'ウィンド',
  'ウェーブ',
]

/**
 * タイトル一覧を発売順に並べ替える。direction='desc'(既定)で新しいものが先頭。
 * 一覧にない未知のタイトル(手動登録した独自タイトル等)は、既知のものより後ろに回す。
 */
export function sortTitlesByReleaseOrder(
  titles: string[],
  direction: 'asc' | 'desc' = 'desc',
): string[] {
  return [...titles].sort((a, b) => {
    const ia = GAME_TITLE_RELEASE_ORDER.indexOf(a)
    const ib = GAME_TITLE_RELEASE_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'ja')
    if (ia === -1) return 1
    if (ib === -1) return -1
    return direction === 'asc' ? ia - ib : ib - ia
  })
}
