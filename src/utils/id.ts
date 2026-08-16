export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // フォールバック(古いブラウザ・非セキュアコンテキスト向け)
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
