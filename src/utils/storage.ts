import type { OshaboEntry } from '../types'

const STORAGE_KEY = 'oshabo-entries'

export function loadEntries(): OshaboEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as OshaboEntry[]
  } catch {
    return []
  }
}

export function saveEntries(entries: OshaboEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}
