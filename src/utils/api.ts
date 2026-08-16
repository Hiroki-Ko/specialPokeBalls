import type { BallType, BallStatusValue, OshaboEntry, PokemonMaster } from '../types'
import type { TitleOverrides } from './titleOverrides'

export interface AppState {
  entries: OshaboEntry[]
  titleOverrides: TitleOverrides
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`APIエラー(${res.status}): ${text || res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/** 起動時に一度だけ呼び、登録データとタイトル手動登録情報をまとめて取得する */
export function fetchState(): Promise<AppState> {
  return request<AppState>('/api/state')
}

/** 起動時にfetchStateと並行して呼び、ポケモンマスタ(図鑑データ)を取得する */
export function fetchPokemonMaster(): Promise<PokemonMaster[]> {
  return request<PokemonMaster[]>('/api/pokemon-master')
}

/** idやcreatedAtはApp.tsx側(createEntry)で既に決定済みのentryをそのまま保存する */
export function apiCreateEntry(entry: OshaboEntry): Promise<void> {
  return request<void>('/api/entries', {
    method: 'POST',
    body: JSON.stringify(entry),
  })
}

export function apiCreateEntriesBulk(entries: OshaboEntry[]): Promise<void> {
  return request<void>('/api/entries/bulk', {
    method: 'POST',
    body: JSON.stringify({ entries }),
  })
}

export function apiUpdateEntry(
  id: string,
  updates: Partial<{
    pokemonId: string
    note: string | null
    ballStatuses: { ballType: BallType; status: BallStatusValue }[]
  }>,
): Promise<void> {
  return request<void>(`/api/entries/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export function apiDeleteEntry(id: string): Promise<void> {
  return request<void>(`/api/entries/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function apiSaveTitleOverrideMembers(title: string, pokemonIds: string[]): Promise<void> {
  return request<void>(`/api/title-overrides/${encodeURIComponent(title)}`, {
    method: 'PUT',
    body: JSON.stringify({ pokemonIds }),
  })
}

export function apiImportEntries(entries: OshaboEntry[]): Promise<void> {
  return request<void>('/api/import', {
    method: 'POST',
    body: JSON.stringify({ entries }),
  })
}
