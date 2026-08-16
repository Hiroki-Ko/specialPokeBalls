// 仕様書(SPEC.md) 6章 データ設計 に対応する型定義

/** 3.1.3 管理対象ボール一覧(オシャボ一覧) */
export const BALL_TYPES = [
  'ラブラブボール',
  'ムーンボール',
  'ヘビーボール',
  'レベルボール',
  'フレンドボール',
  'スピードボール',
  'ルアーボール',
  'サファリボール',
  'コンペボール',
  'ドリームボール',
  'ウルトラボール',
] as const

export type BallType = (typeof BALL_TYPES)[number]

export type BallStatusValue = '未入手' | '入手済み'

/** オシャボごとの入手状況 */
export interface BallStatus {
  ballType: BallType
  status: BallStatusValue
}

/**
 * ポケモンマスタ(参照専用データ)。
 * 収録範囲・生成方法は SPEC.md 6.1・6.2 を参照。
 * アプリ内では編集しない。scripts/generate-pokemon-master.mjs で生成する。
 */
export interface PokemonMaster {
  /** ポケモン(フォルム込み)を一意に識別するID */
  id: string
  /** 全国No.(図鑑番号) */
  nationalNo: number
  /** ポケモン名 */
  name: string
  /** フォルム名(基本フォルムはnull) */
  formName: string | null
  /** タマゴグループ */
  eggGroups: string[]
  /** 孵化までの必要歩数 */
  hatchSteps: number
  /** 夢特性(存在しない場合はnull) */
  hiddenAbility: string | null
  /** そのポケモンが野生で登場する(=捕獲できる)ゲームタイトル一覧 */
  gameTitles: string[]
  /** 画像表示用のPokéAPI内部ID(スプライト取得に使用。フォルム違いは別IDを持つ) */
  spriteId: number
}

/**
 * オシャボリストのユーザー登録データ。
 * ポケモン自体の情報は持たず、PokemonMaster を id で参照する。
 */
export interface OshaboEntry {
  id: string
  /** 対象ポケモン(PokemonMaster.id への参照) */
  pokemonId: string
  note: string | null
  createdAt: string
  ballStatuses: BallStatus[]
}

/** 3.1.3 に基づき、新規登録時にすべて「未入手」の BallStatus[] を生成する */
export function createInitialBallStatuses(): BallStatus[] {
  return BALL_TYPES.map((ballType) => ({ ballType, status: '未入手' as const }))
}
