import type { OshaboEntry, BallType, PokemonMaster } from '../types'
import { getPokemon, displayName, spriteUrl } from '../utils/pokemon'
import { ballImageUrl } from '../utils/ballImages'
import type { SortColumn, SortState } from '../App'

interface Props {
  entries: OshaboEntry[]
  onSelect: (entry: OshaboEntry) => void
  sort: SortState
  onSortColumnClick: (column: SortColumn) => void
  onToggleBall: (entry: OshaboEntry, ballType: BallType) => void
  /** 画面上部に固定表示されるタイトル・絞り込み欄の実測の高さ(px)。一覧見出しをその直下に固定するために使う */
  headerOffset: number
}

function SortIndicator({ column, sort }: { column: SortColumn; sort: SortState }) {
  if (!sort || sort.column !== column) return null
  return <span className="ml-1 text-xs">{sort.direction === 'asc' ? '▲' : '▼'}</span>
}

function BallIcons({
  entry,
  onToggleBall,
  size,
}: {
  entry: OshaboEntry
  onToggleBall: (entry: OshaboEntry, ballType: BallType) => void
  size: string
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {entry.ballStatuses.map((bs) => (
        <button
          key={bs.ballType}
          type="button"
          title={`${bs.ballType}: ${bs.status}(クリックで切り替え)`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleBall(entry, bs.ballType)
          }}
          className="shrink-0 rounded hover:ring-2 hover:ring-indigo-300"
        >
          <img
            src={ballImageUrl(bs.ballType)}
            alt={bs.ballType}
            loading="lazy"
            className={`${size} object-contain transition ${
              bs.status === '入手済み' ? 'opacity-100' : 'opacity-30 grayscale'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

/** PC表示専用。フォルム名がある場合は()内を強制的に2行目へ折り返す(横に長くなり過ぎるのを防ぐ) */
function PokemonNameCell({ pokemon, fallback }: { pokemon: PokemonMaster | undefined; fallback: string }) {
  if (!pokemon) return <span className="truncate">{fallback}</span>
  if (!pokemon.formName) return <span className="truncate">{pokemon.name}</span>
  return (
    <span className="block leading-tight">
      <span className="block truncate">{pokemon.name}</span>
      <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
        ({pokemon.formName})
      </span>
    </span>
  )
}

/**
 * 3.2 一覧表示。No./ポケモンの見出しクリックで並び替え(デフォルト→昇順→降順→デフォルト)。
 * sm以上では表形式、それ未満(スマホ幅)ではカード形式で表示し、オシャボ画像が1行に収まるようにする。
 * メモは一覧では表示せず(詳細画面で確認・編集する)、その分の幅をポケモン名・オシャボ画像に充てている。
 */
export default function PokemonTable({
  entries,
  onSelect,
  sort,
  onSortColumnClick,
  onToggleBall,
  headerOffset,
}: Props) {
  if (entries.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-gray-500">
        登録されているポケモンがありません。「新規登録」または「一括登録」から追加してください。
      </p>
    )
  }

  const stickyStyle = { top: headerOffset }
  const thBase = 'sticky z-10 bg-white py-2 pr-2 dark:bg-gray-900'
  const sortableThBase = `${thBase} cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200`

  return (
    <>
      {/* sm以上: 表形式 */}
      <table className="hidden w-full table-fixed border-collapse text-sm sm:table">
        <colgroup>
          <col className="w-10" />
          <col className="w-24" />
          <col className="w-40" />
          <col />
        </colgroup>
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700">
            <th className={sortableThBase} style={stickyStyle} onClick={() => onSortColumnClick('nationalNo')}>
              No.
              <SortIndicator column="nationalNo" sort={sort} />
            </th>
            <th className={thBase} style={stickyStyle}></th>
            <th className={sortableThBase} style={stickyStyle} onClick={() => onSortColumnClick('name')}>
              ポケモン
              <SortIndicator column="name" sort={sort} />
            </th>
            <th className={thBase} style={stickyStyle}>
              オシャボ進捗
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const pokemon = getPokemon(entry.pokemonId)
            return (
              <tr
                key={entry.id}
                data-national-no={pokemon?.nationalNo}
                className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
                onClick={() => onSelect(entry)}
              >
                <td className="py-2 pr-2">{pokemon?.nationalNo ?? '?'}</td>
                <td className="py-2 pr-2">
                  {pokemon && (
                    <img
                      src={spriteUrl(pokemon)}
                      alt=""
                      loading="lazy"
                      className="h-20 w-20 object-contain"
                      onError={(e) => {
                        e.currentTarget.style.visibility = 'hidden'
                      }}
                    />
                  )}
                </td>
                <td className="py-2 pr-2">
                  <PokemonNameCell pokemon={pokemon} fallback={`(不明: ${entry.pokemonId})`} />
                </td>
                <td className="py-2 pr-2">
                  <BallIcons entry={entry} onToggleBall={onToggleBall} size="h-10 w-10" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* sm未満(スマホ幅): カード形式。オシャボ画像はカード全幅を使い1行に収める */}
      <div className="sm:hidden">
        <div
          className="sticky z-10 flex items-center gap-4 border-b border-gray-200 bg-white py-2 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900"
          style={stickyStyle}
        >
          <button
            type="button"
            className="cursor-pointer select-none"
            onClick={() => onSortColumnClick('nationalNo')}
          >
            No.
            <SortIndicator column="nationalNo" sort={sort} />
          </button>
          <button
            type="button"
            className="cursor-pointer select-none"
            onClick={() => onSortColumnClick('name')}
          >
            ポケモン
            <SortIndicator column="name" sort={sort} />
          </button>
        </div>

        {entries.map((entry) => {
          const pokemon = getPokemon(entry.pokemonId)
          return (
            <div
              key={entry.id}
              data-national-no={pokemon?.nationalNo}
              className="cursor-pointer border-b border-gray-100 py-3 dark:border-gray-800"
              onClick={() => onSelect(entry)}
            >
              <div className="flex items-center gap-3">
                {pokemon && (
                  <img
                    src={spriteUrl(pokemon)}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 shrink-0 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.visibility = 'hidden'
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-500">No.{pokemon?.nationalNo ?? '?'}</div>
                  <div className="truncate font-medium">
                    {pokemon ? displayName(pokemon) : `(不明: ${entry.pokemonId})`}
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <BallIcons entry={entry} onToggleBall={onToggleBall} size="h-6 w-6" />
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
