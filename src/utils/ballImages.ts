import type { BallType } from '../types'

/**
 * BALL_TYPES(日本語表記)とPokéAPIの公開スプライトリポジトリ上のアイテム画像スラッグの対応表。
 * 画像は https://github.com/PokeAPI/sprites の sprites/items/ 以下を参照する(取得済みで存在確認済み)。
 */
const BALL_ITEM_SLUG: Record<BallType, string> = {
  ラブラブボール: 'love-ball',
  ムーンボール: 'moon-ball',
  ヘビーボール: 'heavy-ball',
  レベルボール: 'level-ball',
  フレンドボール: 'friend-ball',
  スピードボール: 'fast-ball',
  ルアーボール: 'lure-ball',
  サファリボール: 'safari-ball',
  コンペボール: 'sport-ball',
  ドリームボール: 'dream-ball',
  // 「ウルトラボール」は日本語名としては通常のUltra Ballではなく、
  // ウルトラビースト捕獲用の特別なボール(英語名: Beast Ball)を指すため、
  // 画像もbeast-ballを参照する
  ウルトラボール: 'beast-ball',
}

export function ballImageUrl(ballType: BallType): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${BALL_ITEM_SLUG[ballType]}.png`
}
