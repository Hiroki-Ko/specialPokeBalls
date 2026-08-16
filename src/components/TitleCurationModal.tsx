import { useMemo, useState } from 'react'
import Modal from './Modal'
import { POKEMON_MASTER, displayName } from '../utils/pokemon'
import type { TitleOverrides } from '../utils/titleOverrides'

interface Props {
  onClose: () => void
  allTitles: string[]
  overrides: TitleOverrides
  onSave: (title: string, pokemonIds: string[]) => void
}

/**
 * ④(手動対応): PokéAPIのロケーションエリア出現データが第7世代以降で不足しているため、
 * 「① タイトルを選択(または新規入力) → ② そのタイトルに内定しているポケモンを選択 → 登録」
 * という手順でゲームタイトルの内定情報を手動補完するための画面。
 * ここでの登録はポケモンマスタ本体(D1のpokemon_masterテーブル)を書き換えるのではなく、
 * D1のtitle_overridesテーブルに追加情報として重ねて保存し、一覧・絞り込みではマスタのgameTitlesと合算して使う。
 */
export default function TitleCurationModal({ onClose, allTitles, overrides, onSave }: Props) {
  const [title, setTitle] = useState('')
  const [query, setQuery] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  // 自動取得(マスタ本体)側で既にそのタイトルに内定しているポケモン。
  // これらは手動登録の対象外(常にチェック済み・変更不可)として扱う。
  const masterMemberIds = useMemo(
    () => new Set(POKEMON_MASTER.filter((p) => title && p.gameTitles.includes(title)).map((p) => p.id)),
    [title],
  )

  const loadTitle = (t: string) => {
    setTitle(t)
    setCheckedIds(new Set(overrides[t] ?? []))
    setQuery('')
  }

  const candidates = useMemo(() => {
    const q = query.trim()
    let list = POKEMON_MASTER
    if (q) {
      const qNum = Number(q)
      list = list.filter(
        (p) =>
          (!Number.isNaN(qNum) && qNum > 0 && p.nationalNo === qNum) ||
          p.name.includes(q) ||
          displayName(p).includes(q),
      )
    }
    return list.slice(0, 50)
  }, [query])

  const toggle = (id: string) => {
    if (masterMemberIds.has(id)) return // マスタ側で確定済みのものは手動では外せない
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const checkRange = () => {
    const lo = Math.min(Number(rangeStart), Number(rangeEnd))
    const hi = Math.max(Number(rangeStart), Number(rangeEnd))
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return
    setCheckedIds((prev) => {
      const next = new Set(prev)
      for (const p of POKEMON_MASTER) {
        if (p.nationalNo >= lo && p.nationalNo <= hi && !masterMemberIds.has(p.id)) next.add(p.id)
      }
      return next
    })
  }

  const handleSave = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    onSave(trimmed, [...checkedIds])
    onClose()
  }

  return (
    <Modal title="ゲームタイトルの手動登録" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          PokéAPI側のデータ不足により自動取得できないゲームタイトルの内定情報を、手動で補完するための画面です。ここでの登録はマスタデータ本体を書き換えるのではなく、追加情報として保存され、一覧の絞り込み等でマスタのデータと合算して使われます。
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium">① タイトルを選択(または新規入力)</label>
          <input
            type="text"
            list="title-suggestions"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            placeholder="例: Legends ZA"
            value={title}
            onChange={(e) => loadTitle(e.target.value)}
          />
          <datalist id="title-suggestions">
            {allTitles.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        {title.trim() && (
          <div className="space-y-2">
            <label className="mb-1 block text-sm font-medium">
              ② 「{title}」に内定しているポケモンを選択する(自動取得済みのものはチェック済み・変更不可)
            </label>

            <div className="flex flex-wrap items-center gap-2 rounded bg-gray-50 p-2 text-sm dark:bg-gray-800">
              <span className="text-gray-500">全国No.範囲でまとめてチェック:</span>
              <input
                type="number"
                className="w-24 rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900"
                placeholder="開始"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
              />
              <span>〜</span>
              <input
                type="number"
                className="w-24 rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-900"
                placeholder="終了"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
              />
              <button
                type="button"
                className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700"
                onClick={checkRange}
              >
                この範囲をチェック
              </button>
            </div>

            <input
              type="text"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              placeholder="全国No.またはポケモン名で絞り込み"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="max-h-72 space-y-1 overflow-auto rounded border border-gray-200 p-2 dark:border-gray-700">
              {candidates.map((p) => {
                const isMaster = masterMemberIds.has(p.id)
                const checked = isMaster || checkedIds.has(p.id)
                return (
                  <li key={p.id}>
                    <label
                      className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${
                        isMaster ? 'text-gray-400' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input type="checkbox" checked={checked} disabled={isMaster} onChange={() => toggle(p.id)} />
                      No.{p.nationalNo} {displayName(p)}
                      {isMaster && <span className="text-xs">(自動取得済み)</span>}
                    </label>
                  </li>
                )
              })}
              {candidates.length === 0 && (
                <li className="px-2 py-1 text-sm text-gray-500">該当するポケモンがありません</li>
              )}
            </ul>
            <p className="text-xs text-gray-500">選択中(手動登録分): {checkedIds.size}件</p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
          <button
            type="button"
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={!title.trim()}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40"
            onClick={handleSave}
          >
            登録する
          </button>
        </div>
      </div>
    </Modal>
  )
}
