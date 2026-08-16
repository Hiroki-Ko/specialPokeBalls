import type { OshaboEntry } from '../types'

/** 3.5 データのエクスポート/インポート */

export function exportEntriesToFile(entries: OshaboEntry[]): void {
  const json = JSON.stringify(entries, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `oshabo-backup-${date}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function parseImportedEntries(text: string): OshaboEntry[] {
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed)) {
    throw new Error('JSONの形式が正しくありません(配列である必要があります)')
  }
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null || !('pokemonId' in item)) {
      throw new Error('JSONの形式が正しくありません(オシャボエントリの形式ではありません)')
    }
  }
  return parsed as OshaboEntry[]
}
