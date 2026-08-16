/**
 * 「同じ番号(世代)のソフトはまとめて1つの選択肢として扱う」ためのグループ定義。
 * 例: 「ソード・シールド」を選ぶと、そのグループに属するどれか1タイトルにでも
 * 出現すれば絞り込み・検索にヒットする(ソードにしか出現しなくても、シールドを
 * 選んでいなくても、グループとしてヒットする)。
 *
 * 発売順(古い→新しい)に並べてある。新しいタイトルを追加する場合は、
 * 対応するグループにタイトル名を追記するか、新しいグループを末尾に追加すること
 * (あわせて src/utils/gameTitleOrder.ts の GAME_TITLE_RELEASE_ORDER にも追加する)。
 */
export interface GameTitleGroup {
  /** 絞り込みドロップダウン等での表示ラベル・選択キー */
  label: string
  /** このグループに属する個別タイトル名(PokemonMaster.gameTitles / title_overridesのキーと同じ表記) */
  titles: string[]
}

export const GAME_TITLE_GROUPS: GameTitleGroup[] = [
  { label: '赤・緑・青・ピカチュウ', titles: ['赤', '緑', '青', 'ピカチュウ'] },
  { label: '金・銀・クリスタル', titles: ['金', '銀', 'クリスタル'] },
  { label: 'ルビー・サファイア・エメラルド', titles: ['ルビー', 'サファイア', 'エメラルド'] },
  { label: 'ファイアレッド・リーフグリーン', titles: ['ファイアレッド', 'リーフグリーン'] },
  { label: 'ダイヤモンド・パール・プラチナ', titles: ['ダイヤモンド', 'パール', 'プラチナ'] },
  { label: 'ハートゴールド・ソウルシルバー', titles: ['ハートゴールド', 'ソウルシルバー'] },
  {
    label: 'ブラック・ホワイト・ブラック2・ホワイト2',
    titles: ['ブラック', 'ホワイト', 'ブラック2', 'ホワイト2'],
  },
  { label: 'X・Y', titles: ['X', 'Y'] },
  { label: 'オメガルビー・アルファサファイア', titles: ['オメガルビー', 'アルファサファイア'] },
  {
    label: 'サン・ムーン・ウルトラサン・ウルトラムーン',
    titles: ['サン', 'ムーン', 'ウルトラサン', 'ウルトラムーン'],
  },
  {
    label: "Let's Go! ピカチュウ・Let's Go! イーブイ",
    titles: ["Let's Go! ピカチュウ", "Let's Go! イーブイ"],
  },
  { label: 'ソード・シールド', titles: ['ソード', 'シールド'] },
  {
    label: 'ブリリアントダイヤモンド・シャイニングパール',
    titles: ['ブリリアントダイヤモンド', 'シャイニングパール'],
  },
  { label: 'Legends アルセウス', titles: ['Legends アルセウス'] },
  { label: 'スカーレット・バイオレット', titles: ['スカーレット', 'バイオレット'] },
  { label: 'Legends ZA', titles: ['Legends ZA'] },
  { label: 'ウィンド・ウェーブ', titles: ['ウィンド', 'ウェーブ'] },
]

/** グループ内の各タイトルが、どのグループに属するかを引くための逆引きマップ */
const TITLE_TO_GROUP_LABEL = new Map<string, string>(
  GAME_TITLE_GROUPS.flatMap((g) => g.titles.map((t) => [t, g.label] as const)),
)

/**
 * 絞り込みドロップダウン等に出すグループ一覧を組み立てる。direction='desc'(既定)で発売の新しい順。
 * 実際にそのタイトルのポケモンが1匹もいなくても、既知のグループは(該当ポケモンが0件になる
 * だけなので)すべて選択肢として出す。手動登録で自由入力された、既知のグループに属さない
 * 独自タイトルは、そのタイトル単体を1グループとして扱い、既知のグループの後ろに(五十音順で)並べる。
 */
export function buildGameTitleGroups(
  existingTitles: string[],
  direction: 'asc' | 'desc' = 'desc',
): GameTitleGroup[] {
  const known = [...GAME_TITLE_GROUPS]
  if (direction === 'desc') known.reverse()

  const extra: GameTitleGroup[] = existingTitles
    .filter((t) => !TITLE_TO_GROUP_LABEL.has(t))
    .sort((a, b) => a.localeCompare(b, 'ja'))
    .map((t) => ({ label: t, titles: [t] }))

  return [...known, ...extra]
}

/** 指定したグループラベルに対応するタイトル一覧を返す(未知のラベルの場合はラベル自体を単体タイトルとして扱う) */
export function titlesInGroup(groups: GameTitleGroup[], label: string): string[] {
  const found = groups.find((g) => g.label === label)
  return found ? found.titles : [label]
}
