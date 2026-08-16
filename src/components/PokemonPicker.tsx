import { useState } from 'react'
import type { PokemonMaster } from '../types'
import { displayName, searchPokemon } from '../utils/pokemon'

interface Props {
  value: PokemonMaster | null
  onChange: (pokemon: PokemonMaster) => void
  placeholder?: string
}

/**
 * 3.1.1 個別登録の「対象ポケモン」入力。
 * 全国No.またはポケモン名でポケモンマスタを検索し、選択する。
 */
export default function PokemonPicker({ value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const results = open ? searchPokemon(query) : []

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        placeholder={placeholder ?? '全国No.またはポケモン名で検索'}
        value={open ? query : value ? displayName(value) : query}
        onFocus={() => {
          setOpen(true)
          setQuery('')
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => {
          // クリック選択を先に処理できるよう少し遅延させて閉じる
          setTimeout(() => setOpen(false), 150)
        }}
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded border border-gray-300 bg-white shadow dark:border-gray-600 dark:bg-gray-800">
          {results.length === 0 && (
            <li className="px-3 py-2 text-sm text-gray-500">該当するポケモンがありません</li>
          )}
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p)
                  setOpen(false)
                }}
              >
                No.{p.nationalNo} {displayName(p)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
