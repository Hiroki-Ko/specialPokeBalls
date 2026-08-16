import { useState } from 'react'
import type { PokemonMaster } from '../types'
import PokemonPicker from './PokemonPicker'
import Modal from './Modal'

interface Props {
  onClose: () => void
  onSubmit: (pokemon: PokemonMaster, note: string) => void
}

/** 3.1.1 個別登録フォーム */
export default function RegisterModal({ onClose, onSubmit }: Props) {
  const [pokemon, setPokemon] = useState<PokemonMaster | null>(null)
  const [note, setNote] = useState('')

  return (
    <Modal title="個別登録" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">対象ポケモン</label>
          <PokemonPicker value={pokemon} onChange={setPokemon} />
        </div>

        {pokemon && (
          <div className="rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
            <div>夢特性: {pokemon.hiddenAbility ?? '-'}</div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">メモ(任意)</label>
          <textarea
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="厳選個体値、色違い希望などの補足"
          />
        </div>

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
            disabled={!pokemon}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-40"
            onClick={() => {
              if (!pokemon) return
              onSubmit(pokemon, note.trim() ? note.trim() : '')
              onClose()
            }}
          >
            登録する
          </button>
        </div>
      </div>
    </Modal>
  )
}
