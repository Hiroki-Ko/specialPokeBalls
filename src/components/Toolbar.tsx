import { useEffect, useState, type ReactNode } from 'react'
import type { StatusFilter } from '../App'
import type { GameTitleGroup } from '../utils/gameTitleGroups'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (v: StatusFilter) => void
  titleFilter: string
  onTitleFilterChange: (v: string) => void
  /** タマゴグループの絞り込み(''=指定なし)と、その選択肢 */
  eggGroupFilter: string
  onEggGroupFilterChange: (v: string) => void
  eggGroups: string[]
  /** 孵化歩数の絞り込み(''=指定なし。数値を文字列で保持)と、その選択肢(少ない順) */
  hatchStepsFilter: string
  onHatchStepsFilterChange: (v: string) => void
  hatchStepsOptions: number[]
  gameTitleGroups: GameTitleGroup[]
  onClearFilters: () => void
  /** 絞り込み後に表示されている匹数と、絞り込み前の全匹数(件数表示用) */
  visibleCount: number
  totalCount: number
  /** 「メニュー」ボタンで開閉するドロワー(登録・エクスポート等)の開閉状態 */
  menuOpen: boolean
  onToggleMenu: () => void
  /**
   * 一覧上の編集モード(デフォルトOFF)。ONの間だけ、
   * ・ボールアイコンのタップで入手済み/未入手を切り替えられる
   * ・各行に「一括入手済み/未入手切替」スイッチが表示される
   * スクロール中に誤ってボールアイコンへ触れて状態が変わってしまうのを防ぐため、
   * 通常はOFFにしてある。登録ボタン等を含む大きなドロワー(menuOpen)とは独立している。
   */
  editMode: boolean
  onToggleEditMode: () => void
  onOpenRegister: () => void
  onOpenBulkRegister: () => void
  onOpenTitleCuration: () => void
  onExport: () => void
  onImportFile: (file: File) => void
  /** タイトル行と絞り込み枠の間に表示する内容(保存エラーの通知など) */
  children?: ReactNode
}

const controlBase =
  'min-w-0 rounded border bg-white text-sm dark:bg-gray-800 dark:text-gray-100'
const controlBorder = (active: boolean) =>
  active ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-600'
const menuItemClass =
  'block w-full px-3.5 py-3 text-left text-sm text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700'

const headerButtonBase =
  'whitespace-nowrap rounded border px-2.5 py-1.5 text-xs sm:px-3.5 sm:text-sm'

/** 条件が入っている絞り込み項目の数を示す丸いバッジ */
function CountBadge({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[11px] font-normal text-white">
      {count}
    </span>
  )
}

/** 小さな項目名つきの入力欄 */
function Field({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-[11px] text-gray-600 dark:text-gray-400 ${className}`}>
      {label}
      {children}
    </label>
  )
}

/**
 * 3.2 検索・絞り込み、および登録・エクスポート/インポートの導線。
 * 並び替えは一覧テーブルの見出しクリックで行うため、ここには置かない。
 *
 * レイアウト(デザイン案E):
 * ・タイトル行の右上に「編集 ON/OFF」「メニュー」を置く(検索の邪魔にならない)。
 * ・検索・ステータス・ゲームタイトルは枠の中に常に表示する(使用頻度が高いため)。
 * ・タマゴグループ・孵化歩数は、スマホ幅では「詳細条件」ボタンで開閉する内側の枠に格納し、
 *   PC幅(sm以上)では常に表示する。
 * ・枠全体も見出し行の▲▼で畳める(デフォルトは開いた状態)。畳むと、
 *   条件が入っている項目数(バッジ)と該当匹数だけを表示する。
 * ・登録・エクスポート等の操作ボタンは、「メニュー」ボタンで開閉するドロワーにまとめている。
 */
export default function Toolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  titleFilter,
  onTitleFilterChange,
  eggGroupFilter,
  onEggGroupFilterChange,
  eggGroups,
  hatchStepsFilter,
  onHatchStepsFilterChange,
  hatchStepsOptions,
  gameTitleGroups,
  onClearFilters,
  visibleCount,
  totalCount,
  menuOpen,
  onToggleMenu,
  editMode,
  onToggleEditMode,
  onOpenRegister,
  onOpenBulkRegister,
  onOpenTitleCuration,
  onExport,
  onImportFile,
  children,
}: Props) {
  const actionsOpen = menuOpen
  const runMenuAction = (action: () => void) => {
    onToggleMenu()
    action()
  }
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToggleMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen, onToggleMenu])
  // 絞り込み枠全体の開閉(デフォルトは開)と、スマホ幅での「詳細条件」の開閉(デフォルトは閉)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [detailOpen, setDetailOpen] = useState(false)

  const detailActiveCount = (eggGroupFilter !== '' ? 1 : 0) + (hatchStepsFilter !== '' ? 1 : 0)
  const activeCount =
    (search.trim() !== '' ? 1 : 0) +
    (statusFilter !== 'all' ? 1 : 0) +
    (titleFilter !== '' ? 1 : 0) +
    detailActiveCount
  const hasActiveFilters = search !== '' || activeCount > 0

  const clearButton = (className: string) => (
    <button
      type="button"
      disabled={!hasActiveFilters}
      className={`text-[13px] text-indigo-700 underline disabled:cursor-default disabled:text-gray-400 disabled:no-underline dark:text-indigo-300 dark:disabled:text-gray-500 ${className}`}
      onClick={onClearFilters}
    >
      絞り込みをクリア
    </button>
  )

  const countText = (
    <span>
      <strong className="text-sm text-gray-900 dark:text-gray-100">{visibleCount}</strong>匹が該当(全
      {totalCount}匹)
    </span>
  )

  return (
    <div className="mb-4">
      <div className="relative z-40 mb-3 flex items-center justify-between gap-2">
        <h1 className="whitespace-nowrap text-xl font-bold">オシャボ管理</h1>
        <div className="relative z-[35] flex gap-1.5 sm:gap-2">
          <button
            type="button"
            className={`${headerButtonBase} ${
              editMode
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800'
            }`}
            onClick={onToggleEditMode}
            aria-pressed={editMode}
            title="ONの間だけ、ボールアイコンのタップで入手済み/未入手を切り替えられ、各行に一括切替スイッチが表示されます(誤タップ防止のため通常はOFF)"
          >
            編集 {editMode ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className={`${headerButtonBase} ${
              actionsOpen
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800'
            }`}
            onClick={onToggleMenu}
            aria-expanded={actionsOpen}
          >
            メニュー {actionsOpen ? '▲' : '▼'}
          </button>
        </div>
          {/* メニューの内容はポップオーバー(タイトル行の下に重ねて表示)。外側タップ/Escで閉じ、項目を押すと閉じる */}
          {actionsOpen && (
            <>
              <div
                className="fixed inset-0 z-30 bg-gray-900/25"
                aria-hidden="true"
                onClick={onToggleMenu}
              />
              <div
                role="menu"
                aria-label="メニュー"
                className="absolute right-0 top-full z-40 mt-1.5 w-60 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="px-3.5 pb-1 pt-1.5 text-[11px] text-gray-500 dark:text-gray-400">登録</div>
                <button type="button" role="menuitem" className={menuItemClass} onClick={() => runMenuAction(onOpenRegister)}>
                  新規登録
                </button>
                <button type="button" role="menuitem" className={menuItemClass} onClick={() => runMenuAction(onOpenBulkRegister)}>
                  一括登録
                </button>
                <button type="button" role="menuitem" className={menuItemClass} onClick={() => runMenuAction(onOpenTitleCuration)}>
                  ゲームタイトル手動登録
                </button>
                <div className="my-1.5 h-px bg-gray-200 dark:bg-gray-700" />
                <div className="px-3.5 pb-1 pt-1.5 text-[11px] text-gray-500 dark:text-gray-400">データ</div>
                <button type="button" role="menuitem" className={menuItemClass} onClick={() => runMenuAction(onExport)}>
                  エクスポート
                </button>
                <label role="menuitem" className={`${menuItemClass} cursor-pointer`}>
                  インポート
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (file) {
                        onImportFile(file)
                        onToggleMenu()
                      }
                    }}
                  />
                </label>
              </div>
            </>
          )}
      </div>

      {children}

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
        <button
          type="button"
          aria-expanded={filtersOpen}
          className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <span className="flex items-center gap-2">
            絞り込み
            <CountBadge count={activeCount} />
          </span>
          <span className="flex items-center gap-2 text-xs font-normal text-gray-600 dark:text-gray-400">
            {/* 畳んでいる間は件数も見出しに出す。PC幅は開いていても常に出す(スマホ幅は下部の件数行に出る) */}
            <span className={filtersOpen ? 'hidden sm:inline' : ''}>{countText}</span>
            <span aria-hidden="true" className="text-lg leading-none text-gray-700 dark:text-gray-300">
              {filtersOpen ? '▴' : '▾'}
            </span>
          </span>
        </button>

        {filtersOpen && (
          <div className="mt-2.5 flex flex-col gap-2.5">
            {/* 1段目: 検索・ステータス・ゲームタイトル(常に表示) */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
              <Field label="検索" className="sm:w-44">
                <input
                  type="text"
                  className={`${controlBase} ${controlBorder(search !== '')} px-3 py-2 sm:py-1.5`}
                  placeholder="名前・No.で検索"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2 sm:contents">
                <Field label="ステータス">
                  <select
                    className={`${controlBase} ${controlBorder(statusFilter !== 'all')} px-2 py-2 sm:py-1.5`}
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
                  >
                    <option value="all">指定なし</option>
                    <option value="未入手">未入手のみ</option>
                    <option value="入手済み">入手済みのみ</option>
                  </select>
                </Field>
                <Field label="ゲームタイトル">
                  <select
                    className={`${controlBase} ${controlBorder(titleFilter !== '')} px-2 py-2 sm:py-1.5`}
                    value={titleFilter}
                    onChange={(e) => onTitleFilterChange(e.target.value)}
                  >
                    <option value="">指定なし</option>
                    {gameTitleGroups.map((g) => (
                      <option key={g.label} value={g.label}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            {/* スマホ幅のみ: 詳細条件(タマゴグループ・孵化歩数)の開閉ボタン */}
            <button
              type="button"
              aria-expanded={detailOpen}
              className={`flex items-center justify-between rounded border px-3 py-2 text-[13px] sm:hidden ${
                detailOpen
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
                  : 'border-dashed border-gray-400 bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}
              onClick={() => setDetailOpen((v) => !v)}
            >
              <span className="flex items-center gap-1.5">
                詳細条件(タマゴグループ・歩数)
                <CountBadge count={detailActiveCount} />
              </span>
              <span aria-hidden="true" className="text-lg leading-none text-gray-700 dark:text-gray-300">
                {detailOpen ? '▴' : '▾'}
              </span>
            </button>

            {/* 2段目: タマゴグループ・孵化歩数。スマホ幅は開いたときだけ濃い色の内側の枠で表示、PC幅は常に表示 */}
            <div
              className={`${detailOpen ? 'grid' : 'hidden'} grid-cols-2 gap-2 rounded-lg border border-gray-300 bg-gray-200 p-2.5 dark:border-gray-600 dark:bg-gray-700/60 sm:flex sm:items-end sm:gap-2.5 sm:rounded-none sm:border-0 sm:border-t sm:border-gray-200 sm:bg-transparent sm:p-0 sm:pt-2.5 sm:dark:border-gray-700 sm:dark:bg-transparent`}
            >
              <Field label="タマゴグループ">
                <select
                  className={`${controlBase} ${controlBorder(eggGroupFilter !== '')} px-2 py-2 sm:py-1.5`}
                  value={eggGroupFilter}
                  onChange={(e) => onEggGroupFilterChange(e.target.value)}
                >
                  <option value="">指定なし</option>
                  {eggGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="孵化歩数">
                <select
                  className={`${controlBase} ${controlBorder(hatchStepsFilter !== '')} px-2 py-2 sm:py-1.5`}
                  value={hatchStepsFilter}
                  onChange={(e) => onHatchStepsFilterChange(e.target.value)}
                >
                  <option value="">指定なし</option>
                  {hatchStepsOptions.map((n) => (
                    <option key={n} value={String(n)}>
                      {n.toLocaleString()}歩
                    </option>
                  ))}
                </select>
              </Field>
              {clearButton('hidden py-1.5 sm:ml-auto sm:block')}
            </div>

            {/* スマホ幅のみ: 件数とクリア(PC幅は見出し行・2段目右端に出る) */}
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 sm:hidden">
              {countText}
              {clearButton('py-1.5')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
