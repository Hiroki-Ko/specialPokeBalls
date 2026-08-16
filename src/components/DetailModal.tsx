import { useState } from 'react'
import type { OshaboEntry } from '../types'
import { BALL_TYPES } from '../types'
import { getPokemon, displayName } from '../utils/pokemon'
import Modal from './Modal'

interface Props {
  entry: OshaboEntry
  /** trueならD1に実エントリがある(オシャボ入手状況やメモを一度でも編集したことがある)状態 */
  hasRealData: boolean
  onClose: () => void
  onToggleBall: (ballType: (typeof BALL_TYPES)[number]) => void
  onSave: (updates: { note: string | null }) => void
  onDelete: () => void
}

/**
 * 5章 詳細表示 / 3.3 ステータス管理 / 3.4 編集・削除
 * マスタ全種が常に一覧に表示される仕様のため、この画面は常に特定の1匹(マスタの1行)に対応する。
 * そのため対象ポケモン自体の変更はできず、編集できるのはメモのみ。
 */
export default function DetailModal({ entry, hasRealData, onClose, onToggleBall, onSave, onDelete }: Props) {
  const pokemon = getPokemon(entry.pokemonId)
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState(entry.note ?? '')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!pokemon) {
    return (
      <Modal title="不明なポケモン" onClose={onClose}>
        <p className="text-sm text-red-600">
          ポケモンマスタにこのエントリが参照するポケモン(id: {entry.pokemonId})が見つかりません。
        </p>
        <div className="flex justify-end pt-4">
          <button
            type="button"
            className="rounded bg-red-600 px-4 py-2 text-sm text-white"
            onClick={onDelete}
          >
            このエントリを削除する
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`No.${pokemon.nationalNo} ${displayName(pokemon)}`} onClose={onClose} wide>
      <div className="space-y-4">
        <table className="w-full rounded bg-gray-50 text-sm dark:bg-gray-800">
          <tbody>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="w-40 px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                夢特性
              </th>
              <td className="px-3 py-2">{pokemon.hiddenAbility ?? '-'}</td>
            </tr>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                タマゴグループ
              </th>
              <td className="px-3 py-2">{pokemon.eggGroups.join('・') || '-'}</td>
            </tr>
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400">
                孵化までの必要歩数
              </th>
              <td className="px-3 py-2">{pokemon.hatchSteps}</td>
            </tr>
          </tbody>
        </table>

        <div>
          <label className="mb-2 block text-sm font-medium">オシャボの入手状況</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {entry.ballStatuses.map((bs) => (
              <button
                key={bs.ballType}
                type="button"
                onClick={() => onToggleBall(bs.ballType)}
                className={`rounded border px-3 py-2 text-left text-sm transition ${
                  bs.status === '入手済み'
                    ? 'border-green-400 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : 'border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <div>{bs.ballType}</div>
                <div className="text-xs opacity-70">{bs.status}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">メモ</label>
          {editing ? (
            <textarea
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          ) : (
            <p className="min-h-6 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {entry.note || '(なし)'}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
          <div>
            {hasRealData &&
              (confirmingDelete ? (
                <div className="flex items-center gap-2 text-sm">
                  <span>入手状況とメモを初期状態に戻しますか?</span>
                  <button
                    type="button"
                    className="rounded bg-red-600 px-3 py-1 text-white"
                    onClick={onDelete}
                  >
                    リセットする
                  </button>
                  <button
                    type="button"
                    className="rounded px-3 py-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    やめる
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-sm text-red-600 hover:underline"
                  onClick={() => setConfirmingDelete(true)}
                >
                  入手状況・メモをリセットする
                </button>
              ))}
          </div>

          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  type="button"
                  className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  onClick={() => {
                    setEditing(false)
                    setNote(entry.note ?? '')
                  }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="rounded bg-indigo-600 px-4 py-2 text-sm text-white"
                  onClick={() => {
                    onSave({ note: note.trim() ? note.trim() : null })
                    setEditing(false)
                  }}
                >
                  保存する
                </button>
              </>
            ) : (
              <button
                type="button"
                className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
                onClick={() => setEditing(true)}
              >
                編集する
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
