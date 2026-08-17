import type { StatusFilter } from '../App'
import type { GameTitleGroup } from '../utils/gameTitleGroups'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (v: StatusFilter) => void
  titleFilter: string
  onTitleFilterChange: (v: string) => void
  gameTitleGroups: GameTitleGroup[]
  onClearFilters: () => void
  /** 「編集」ボタンで開閉するドロワー(登録・エクスポート等)の開閉状態。一覧側の一括切替スイッチの表示条件も兼ねるため、Appで一元管理する */
  editMode: boolean
  onToggleEditMode: () => void
  onOpenRegister: () => void
  onOpenBulkRegister: () => void
  onOpenTitleCuration: () => void
  onExport: () => void
  onImportFile: (file: File) => void
}

/**
 * 3.2 検索・絞り込み、および登録・エクスポート/インポートの導線。
 * 並び替えは一覧テーブルの見出しクリックで行うため、ここには置かない。
 * 登録・エクスポート等の操作ボタンは、絞り込み欄右端の「編集」ボタンで開閉するドロワーにまとめている。
 */
export default function Toolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  titleFilter,
  onTitleFilterChange,
  gameTitleGroups,
  onClearFilters,
  editMode,
  onToggleEditMode,
  onOpenRegister,
  onOpenBulkRegister,
  onOpenTitleCuration,
  onExport,
  onImportFile,
}: Props) {
  const actionsOpen = editMode
  const hasActiveFilters = search !== '' || statusFilter !== 'all' || titleFilter !== ''

  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <input
          type="text"
          className="col-span-2 rounded border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 sm:w-48"
          placeholder="ポケモン名・全国No.・ボール名で検索(部分一致)"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <select
          className="min-w-0 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        >
          <option value="all">すべてのステータス</option>
          <option value="未入手">未入手のみ</option>
          <option value="入手済み">入手済みのみ</option>
        </select>

        <select
          className="min-w-0 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800"
          value={titleFilter}
          onChange={(e) => onTitleFilterChange(e.target.value)}
        >
          <option value="">すべてのゲームタイトル</option>
          {gameTitleGroups.map((g) => (
            <option key={g.label} value={g.label}>
              {g.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={!hasActiveFilters}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent dark:border-gray-600 dark:hover:bg-gray-800"
          onClick={onClearFilters}
        >
          絞り込みをクリア
        </button>

        <button
          type="button"
          className={`rounded border px-3 py-1.5 text-sm sm:ml-auto ${
            actionsOpen
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800'
          }`}
          onClick={onToggleEditMode}
          aria-expanded={actionsOpen}
        >
          編集 {actionsOpen ? '▲' : '▼'}
        </button>
      </div>

      {actionsOpen && (
        <div className="mt-2 flex flex-wrap gap-2 rounded border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <button
            type="button"
            className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white"
            onClick={onOpenRegister}
          >
            新規登録
          </button>
          <button
            type="button"
            className="rounded bg-indigo-500 px-3 py-1.5 text-sm text-white"
            onClick={onOpenBulkRegister}
          >
            一括登録
          </button>
          <button
            type="button"
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
            onClick={onOpenTitleCuration}
          >
            ゲームタイトル手動登録
          </button>
          <button
            type="button"
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
            onClick={onExport}
          >
            エクスポート
          </button>
          <label className="cursor-pointer rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700">
            インポート
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onImportFile(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      )}
    </div>
  )
}
