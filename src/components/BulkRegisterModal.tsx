import { useState } from 'react'
import Modal from './Modal'
import { parseBulkInput, parseBulkRange, type BulkParseResult } from '../utils/bulkRegister'
import type { PokemonMaster } from '../types'
import { displayName } from '../utils/pokemon'

interface Props {
  onClose: () => void
  onSubmit: (pokemons: PokemonMaster[]) => void
  registeredIds: ReadonlySet<string>
}

type Mode = 'lines' | 'range'

/** 3.1.2 一括登録フォーム */
export default function BulkRegisterModal({ onClose, onSubmit, registeredIds }: Props) {
  const [mode, setMode] = useState<Mode>('range')

  const [text, setText] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')

  const [result, setResult] = useState<BulkParseResult | null>(null)

  const handlePreview = () => {
    if (mode === 'lines') {
      setResult(parseBulkInput(text))
    } else {
      setResult(parseBulkRange(Number(rangeStart), Number(rangeEnd), registeredIds))
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setResult(null)
  }

  const handleRegister = () => {
    if (!result || result.successes.length === 0) return
    onSubmit(result.successes.map((s) => s.pokemon))
    onClose()
  }

  return (
    <Modal title="一括登録" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-sm ${
              mode === 'range'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
            onClick={() => switchMode('range')}
          >
            全国No.範囲で一括登録
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1.5 text-sm ${
              mode === 'lines'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
            onClick={() => switchMode('lines')}
          >
            個別に行入力
          </button>
        </div>

        {mode === 'range' ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              全国No.の範囲を指定すると、その範囲に該当するポケモン(マスタデータ内のリージョンフォーム等を含む)を自動で抽出します。新タイトル発売時にまとめて追加したい場合に使ってください。既に登録済みのポケモンは自動的にスキップされます。
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-28 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                placeholder="開始 例:906"
                value={rangeStart}
                onChange={(e) => {
                  setRangeStart(e.target.value)
                  setResult(null)
                }}
              />
              <span className="text-gray-500">〜</span>
              <input
                type="number"
                className="w-28 rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                placeholder="終了 例:1025"
                value={rangeEnd}
                onChange={(e) => {
                  setRangeEnd(e.target.value)
                  setResult(null)
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              1行1件、「全国No.,フォルム」の形式で入力してください(フォルムは省略可。例:
              <code className="mx-1 rounded bg-gray-100 px-1 dark:bg-gray-800">906</code>
              <code className="mx-1 rounded bg-gray-100 px-1 dark:bg-gray-800">52,ガラルのすがた</code>)
            </p>
            <textarea
              className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800"
              rows={8}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setResult(null)
              }}
              placeholder={'906\n52,ガラルのすがた\n133'}
            />
          </>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
            onClick={handlePreview}
          >
            内容を確認する
          </button>
        </div>

        {result && (
          <div className="max-h-64 space-y-2 overflow-auto rounded border border-gray-200 p-3 text-sm dark:border-gray-700">
            <div>
              登録対象: {result.successes.length}件 / スキップ: {result.skipped.length}件
            </div>
            {result.successes.length > 0 && (
              <ul className="list-disc pl-5 text-green-700 dark:text-green-400">
                {result.successes.map((s, i) => (
                  <li key={i}>
                    {s.line} → No.{s.pokemon.nationalNo} {displayName(s.pokemon)}
                  </li>
                ))}
              </ul>
            )}
            {result.skipped.length > 0 && (
              <ul className="list-disc pl-5 text-red-600 dark:text-red-400">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    {s.line} → スキップ({s.reason})
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            disabled={!result || result.successes.length === 0}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40"
            onClick={handleRegister}
          >
            登録する
          </button>
        </div>
      </div>
    </Modal>
  )
}
