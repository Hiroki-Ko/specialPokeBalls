import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { OshaboEntry } from './types'
import { createInitialBallStatuses } from './types'
import type { PokemonMaster } from './types'
import {
  fetchState,
  fetchPokemonMaster,
  apiCreateEntry,
  apiCreateEntriesBulk,
  apiUpdateEntry,
  apiDeleteEntry,
  apiSaveTitleOverrideMembers,
  apiImportEntries,
} from './utils/api'
import { generateId } from './utils/id'
import { getPokemon, displayName, allGameTitles, setPokemonMaster, POKEMON_MASTER } from './utils/pokemon'
import { kanaIncludes } from './utils/kana'
import { exportEntriesToFile, parseImportedEntries } from './utils/exportImport'
import { sortTitlesByReleaseOrder, GAME_TITLE_RELEASE_ORDER } from './utils/gameTitleOrder'
import { buildGameTitleGroups, titlesInGroup } from './utils/gameTitleGroups'
import { setTitleMembers, getEffectiveGameTitles, type TitleOverrides } from './utils/titleOverrides'
import Toolbar from './components/Toolbar'
import PokemonTable from './components/PokemonTable'
import RegisterModal from './components/RegisterModal'
import BulkRegisterModal from './components/BulkRegisterModal'
import TitleCurationModal from './components/TitleCurationModal'
import DetailModal from './components/DetailModal'

export type StatusFilter = 'all' | '未入手' | '入手済み'
export type SortColumn = 'nationalNo' | 'name'
export type SortDirection = 'asc' | 'desc'
export type SortState = { column: SortColumn; direction: SortDirection } | null

/** 見出しクリックのたびに デフォルト(null) → 昇順 → 降順 → デフォルト の順で切り替える */
function nextSortState(current: SortState, column: SortColumn): SortState {
  if (!current || current.column !== column) return { column, direction: 'asc' }
  if (current.direction === 'asc') return { column, direction: 'desc' }
  return null
}

function createEntry(pokemonId: string, note: string): OshaboEntry {
  return {
    id: generateId(),
    pokemonId,
    note: note || null,
    createdAt: new Date().toISOString(),
    ballStatuses: createInitialBallStatuses(),
  }
}

export default function App() {
  const [entries, setEntries] = useState<OshaboEntry[]>([])
  const [titleOverrides, setTitleOverrides] = useState<TitleOverrides>({})

  // Cloudflare D1(Pages Functions経由)からの初回読み込み状態
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // 各種更新(登録・編集・削除等)をD1側へ保存する際に失敗した場合の通知
  // (画面はいったん楽観的に更新済みのため、alertで都度ブロックせずバナー表示に留める)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [titleFilter, setTitleFilter] = useState('')
  const [sort, setSort] = useState<SortState>(null)
  // 「編集」ボタンで開閉するドロワー(登録・エクスポート等)の開閉状態。
  const [editMode, setEditMode] = useState(false)
  // 一覧の行に表示する「一括入手済み/未入手切替」スイッチの表示状態。
  // 以前は編集ドロワーの開閉と連動していたが、スイッチを使うためだけに
  // 登録ボタン等を含む大きなドロワーを開く必要があり、モバイルで画面の大部分が
  // 隠れてしまう問題があったため、独立したON/OFFに分離した。
  const [bulkToggleMode, setBulkToggleMode] = useState(false)

  const [showRegister, setShowRegister] = useState(false)
  const [showBulkRegister, setShowBulkRegister] = useState(false)
  const [showTitleCuration, setShowTitleCuration] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // ポケモンマスタ(図鑑データ)と登録データ・タイトル手動登録情報を並行して取得する。
    // マスタは setPokemonMaster() で utils/pokemon.ts 側に反映してから loading を解除するため、
    // それ以降にレンダリングされる画面では常にマスタが読み込み済みの状態で同期的に参照できる。
    Promise.all([fetchPokemonMaster(), fetchState()])
      .then(([master, state]) => {
        if (cancelled) return
        setPokemonMaster(master)
        setEntries(state.entries)
        setTitleOverrides(state.titleOverrides)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const notifySaveError = (context: string, err: unknown) => {
    console.error(context, err)
    setSaveError(`${context}の保存に失敗しました。通信状況を確認し、再度お試しください。`)
  }

  // タイトル・絞り込み欄を画面上部に固定表示するため、その高さを実測して
  // 一覧テーブルの見出し(sticky)をその直下に重ならず配置できるようにする
  const headerRef = useRef<HTMLDivElement>(null)
  const [headerHeight, setHeaderHeight] = useState(0)

  useLayoutEffect(() => {
    const el = headerRef.current
    // ローディング中はheaderRefを持つ要素自体がまだDOMに存在しないため、
    // [](マウント時1回だけ)に依存させるとヌルのまま観測が始まらず、
    // 読み込み完了後もheaderHeightが0のまま(=表の見出しがツールバーの裏に隠れる)になってしまう。
    // loadingの変化に合わせてこのeffectを実際の描画後に再実行させることで、
    // 要素が実在するタイミングで確実にResizeObserverを仕込む。
    if (!el) return
    const update = () => setHeaderHeight(el.getBoundingClientRect().height)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [loading])

  // 100番台ジャンプボタン用: 直前に自分でジャンプさせた先の全国No.と、
  // スムーススクロール中かどうか、その間にユーザーが手動でスクロールしたかどうかを記録する。
  // これにより、スムーススクロールが終わる前に連続でボタンを押しても
  // (アニメーション中の中途半端なスクロール位置を毎回測り直すのではなく)
  // 直前のジャンプ先を基準に確実に1ブロックずつ進められるようにする。
  const lastJumpNoRef = useRef<number | null>(null)
  const isProgrammaticScrollRef = useRef(false)
  const userScrolledRef = useRef(false)

  useEffect(() => {
    const handleScroll = () => {
      if (!isProgrammaticScrollRef.current) {
        userScrolledRef.current = true
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 100番台ジャンプボタンの表示制御: ページの最上部・最下部にいる間はボタンを隠す
  // (最上部で「前へ」、最下部で「次へ」を押しても意味がないため)。
  // 少しでもスクロールしてどちらの端からも離れたら再表示する。
  const [showJumpButtons, setShowJumpButtons] = useState(false)

  const updateJumpButtonsVisibility = useRef(() => {
    const EDGE_THRESHOLD = 4 // px。端判定に多少の遊びを持たせる
    const scrollY = window.scrollY
    const atTop = scrollY <= EDGE_THRESHOLD
    const atBottom = scrollY + window.innerHeight >= document.documentElement.scrollHeight - EDGE_THRESHOLD
    setShowJumpButtons(!atTop && !atBottom)
  }).current

  useEffect(() => {
    updateJumpButtonsVisibility()
    window.addEventListener('scroll', updateJumpButtonsVisibility, { passive: true })
    window.addEventListener('resize', updateJumpButtonsVisibility)
    return () => {
      window.removeEventListener('scroll', updateJumpButtonsVisibility)
      window.removeEventListener('resize', updateJumpButtonsVisibility)
    }
  }, [updateJumpButtonsVisibility])

  const registeredIds = useMemo(() => new Set(entries.map((e) => e.pokemonId)), [entries])

  // pokemonId → 実際にD1へ保存されているエントリ、の対応表(1ポケモンにつき実体は最大1件の前提)
  const registeredByPokemonId = useMemo(() => new Map(entries.map((e) => [e.pokemonId, e])), [entries])

  /**
   * マスタ全件(POKEMON_MASTER)を基準にした表示用の一覧。
   * D1に実体(登録済みエントリ)があればそれを使い、なければ「全ボール未入手・メモなし」の
   * 仮の行(id はそのポケモン自身の id と一致させる)をその場で作る。
   * これにより、一度も登録操作をしていないポケモンも含めて常に全種が一覧に表示され、
   * 実際にオシャボ入手状況やメモを触った瞬間に初めてD1側へ実エントリが作成される。
   */
  const allDisplayEntries = useMemo<OshaboEntry[]>(() => {
    return POKEMON_MASTER.map((p) => {
      const real = registeredByPokemonId.get(p.id)
      if (real) return real
      return {
        id: p.id,
        pokemonId: p.id,
        note: null,
        createdAt: '',
        ballStatuses: createInitialBallStatuses(),
      }
    })
  }, [registeredByPokemonId])

  // ④手動対応分を含めたゲームタイトル一覧(個別タイトル単位、発売順の降順)。
  // 「ゲームタイトル手動登録」画面の①タイトル選択の候補には、グループではなく個別タイトルを出す。
  const individualGameTitles = useMemo(() => {
    const set = new Set(allGameTitles())
    for (const [t, ids] of Object.entries(titleOverrides)) {
      if (ids.length > 0) set.add(t)
    }
    return sortTitlesByReleaseOrder([...set], 'desc')
  }, [titleOverrides])

  // 絞り込みドロップダウン用: 同世代の複数タイトル(例: ソード・シールド)を1つの選択肢にまとめたもの。
  // どれか1タイトルにでも出現すれば、そのグループを選んだ時にヒットする。
  const gameTitleGroups = useMemo(
    () => buildGameTitleGroups(individualGameTitles, 'desc'),
    [individualGameTitles],
  )

  // 詳細画面「出現するソフト」欄用: 実際に使われているかどうかに関わらず、既知のタイトルを
  // すべて発売順(新しい順)で網羅する。該当しないものはチェックが付かないだけなので、
  // 未使用のタイトルも含めて全部見せてよい(手動で自由入力された独自タイトルも末尾に含める)。
  const allKnownTitles = useMemo(
    () =>
      sortTitlesByReleaseOrder([...new Set([...GAME_TITLE_RELEASE_ORDER, ...individualGameTitles])], 'desc'),
    [individualGameTitles],
  )

  const visibleEntries = useMemo(() => {
    const q = search.trim()
    const titleFilterMembers = titleFilter ? titlesInGroup(gameTitleGroups, titleFilter) : null

    let list = allDisplayEntries.filter((entry) => {
      const pokemon = getPokemon(entry.pokemonId)

      if (titleFilterMembers) {
        const matchesTitle = pokemon
          ? getEffectiveGameTitles(pokemon, titleOverrides).some((t) => titleFilterMembers.includes(t))
          : false
        if (!matchesTitle) return false
      }

      if (statusFilter !== 'all') {
        const allObtained = entry.ballStatuses.every((b) => b.status === '入手済み')
        if (statusFilter === '入手済み' && !allObtained) return false
        if (statusFilter === '未入手' && allObtained) return false
      }

      if (q) {
        const matchesPokemon =
          pokemon !== undefined &&
          (kanaIncludes(pokemon.name, q) ||
            kanaIncludes(displayName(pokemon), q) ||
            String(pokemon.nationalNo).includes(q))
        const matchesBall = entry.ballStatuses.some((b) => kanaIncludes(b.ballType, q))
        if (!matchesPokemon && !matchesBall) return false
      }

      return true
    })

    // sortがnull(デフォルト)の場合は元の登録順のまま並び替えない
    if (sort) {
      const { column, direction } = sort
      list = [...list].sort((a, b) => {
        const pa = getPokemon(a.pokemonId)
        const pb = getPokemon(b.pokemonId)
        const cmp =
          column === 'name'
            ? (pa ? displayName(pa) : '').localeCompare(pb ? displayName(pb) : '', 'ja')
            : (pa?.nationalNo ?? 0) - (pb?.nationalNo ?? 0)
        return direction === 'asc' ? cmp : -cmp
      })
    }

    return list
  }, [allDisplayEntries, search, statusFilter, titleFilter, sort, titleOverrides, gameTitleGroups])

  // 絞り込み・並び替えが変わると一覧上の全国No.の並びの意味が変わるため、
  // 100番台ジャンプボタンが覚えている「直前のジャンプ先」は無効化して実測し直す。
  // また、絞り込みで一覧の高さ自体が変わり、スクロールせずとも最上部/最下部の
  // 判定が変わる場合があるため、ジャンプボタンの表示状態も併せて再計算する。
  useEffect(() => {
    lastJumpNoRef.current = null
    updateJumpButtonsVisibility()
  }, [search, statusFilter, titleFilter, sort, updateJumpButtonsVisibility])

  const selectedEntry = allDisplayEntries.find((e) => e.id === selectedEntryId) ?? null

  const handleRegisterSingle = (pokemon: PokemonMaster, note: string) => {
    // 既に実エントリがあるポケモンを重複登録しないようにする(全種デフォルト表示化に伴うガード)
    if (registeredByPokemonId.has(pokemon.id)) return
    const entry = createEntry(pokemon.id, note)
    setEntries((prev) => [...prev, entry])
    apiCreateEntry(entry).catch((err: unknown) => notifySaveError('登録', err))
  }

  const handleRegisterBulk = (pokemons: PokemonMaster[]) => {
    const targets = pokemons.filter((p) => !registeredByPokemonId.has(p.id))
    if (targets.length === 0) return
    const newEntries = targets.map((p) => createEntry(p.id, ''))
    setEntries((prev) => [...prev, ...newEntries])
    apiCreateEntriesBulk(newEntries).catch((err: unknown) => notifySaveError('一括登録', err))
  }

  const handleToggleBallForEntry = (
    entryId: string,
    ballType: OshaboEntry['ballStatuses'][number]['ballType'],
  ) => {
    const existing = entries.find((e) => e.id === entryId)

    if (existing) {
      const newBallStatuses = existing.ballStatuses.map((bs) =>
        bs.ballType === ballType
          ? { ...bs, status: (bs.status === '未入手' ? '入手済み' : '未入手') as typeof bs.status }
          : bs,
      )
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, ballStatuses: newBallStatuses } : e)))
      apiUpdateEntry(entryId, { ballStatuses: newBallStatuses }).catch((err: unknown) =>
        notifySaveError('オシャボ入手状況', err),
      )
      return
    }

    // まだD1上に実体がない(マスタ由来のデフォルト表示行)場合は、この操作をきっかけに実エントリを新規作成する。
    // 仮の行のidは対象ポケモンのidと一致させているため、entryId はそのまま pokemonId として使える。
    const pokemon = getPokemon(entryId)
    if (!pokemon) return
    const newBallStatuses = createInitialBallStatuses().map((bs) =>
      bs.ballType === ballType ? { ...bs, status: '入手済み' as const } : bs,
    )
    const newEntry: OshaboEntry = {
      id: pokemon.id,
      pokemonId: pokemon.id,
      note: null,
      createdAt: new Date().toISOString(),
      ballStatuses: newBallStatuses,
    }
    setEntries((prev) => [...prev, newEntry])
    apiCreateEntry(newEntry).catch((err: unknown) => notifySaveError('オシャボ入手状況', err))
  }

  // 編集モード用: 対象ポケモン1匹分のオシャボ11種すべてを一括で入手済み/未入手に切り替える。
  // (初期値登録時に「すべて未入手→すべて入手済み」へ切り替える対象が多いための一括操作)
  const handleBulkToggleForEntry = (entryId: string, makeAllObtained: boolean) => {
    const newStatus = makeAllObtained ? ('入手済み' as const) : ('未入手' as const)
    const existing = entries.find((e) => e.id === entryId)

    if (existing) {
      const newBallStatuses = existing.ballStatuses.map((bs) => ({ ...bs, status: newStatus }))
      setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, ballStatuses: newBallStatuses } : e)))
      apiUpdateEntry(entryId, { ballStatuses: newBallStatuses }).catch((err: unknown) =>
        notifySaveError('オシャボ入手状況', err),
      )
      return
    }

    // まだD1上に実体がない(マスタ由来のデフォルト表示行)場合は、この操作をきっかけに実エントリを新規作成する。
    const pokemon = getPokemon(entryId)
    if (!pokemon) return
    const newBallStatuses = createInitialBallStatuses().map((bs) => ({ ...bs, status: newStatus }))
    const newEntry: OshaboEntry = {
      id: pokemon.id,
      pokemonId: pokemon.id,
      note: null,
      createdAt: new Date().toISOString(),
      ballStatuses: newBallStatuses,
    }
    setEntries((prev) => [...prev, newEntry])
    apiCreateEntry(newEntry).catch((err: unknown) => notifySaveError('オシャボ入手状況', err))
  }

  // 詳細モーダル用(選択中エントリに対する切り替え)
  const handleToggleBall = (ballType: OshaboEntry['ballStatuses'][number]['ballType']) => {
    if (!selectedEntry) return
    handleToggleBallForEntry(selectedEntry.id, ballType)
  }

  const handleSaveDetail = (updates: { note: string | null }) => {
    if (!selectedEntry) return
    const entryId = selectedEntry.id
    const existing = entries.find((e) => e.id === entryId)

    if (existing) {
      setEntries((prev) => prev.map((e) => (e.id !== entryId ? e : { ...e, ...updates })))
      apiUpdateEntry(entryId, updates).catch((err: unknown) => notifySaveError('編集内容', err))
      return
    }

    // 仮の行(未登録)の場合は、メモ保存を機に実エントリを新規作成する
    const newEntry: OshaboEntry = {
      id: selectedEntry.pokemonId,
      pokemonId: selectedEntry.pokemonId,
      note: updates.note,
      createdAt: new Date().toISOString(),
      ballStatuses: selectedEntry.ballStatuses,
    }
    setEntries((prev) => [...prev, newEntry])
    apiCreateEntry(newEntry).catch((err: unknown) => notifySaveError('編集内容', err))
  }

  /**
   * マスタ全種を常に表示する仕様のため、「削除」は一覧から行を消すのではなく、
   * そのポケモンのオシャボ入手状況・メモを初期状態(全ボール未入手・メモなし)へリセットする、
   * という意味になる(D1側の実エントリ行は削除し、表示は仮の行にフォールバックする)。
   */
  const handleDelete = () => {
    if (!selectedEntry) return
    const entryId = selectedEntry.id
    const wasReal = entries.some((e) => e.id === entryId)
    setSelectedEntryId(null)
    if (!wasReal) return
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
    apiDeleteEntry(entryId).catch((err: unknown) => notifySaveError('リセット', err))
  }

  const handleSortColumnClick = (column: SortColumn) => {
    setSort((prev) => nextSortState(prev, column))
  }

  const handleClearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setTitleFilter('')
  }

  const handleSaveTitleOverride = (title: string, pokemonIds: string[]) => {
    setTitleOverrides((prev) => setTitleMembers(prev, title, pokemonIds))
    apiSaveTitleOverrideMembers(title, pokemonIds).catch((err: unknown) =>
      notifySaveError('ゲームタイトルの手動登録', err),
    )
  }

  /** 詳細画面から、特定のポケモン1匹について特定のタイトルへの手動登録を追加/解除する */
  const handleToggleTitleForPokemon = (title: string, include: boolean) => {
    if (!selectedEntry) return
    const pokemonId = selectedEntry.pokemonId
    const current = titleOverrides[title] ?? []
    const has = current.includes(pokemonId)
    if (has === include) return
    const next = include ? [...current, pokemonId] : current.filter((id) => id !== pokemonId)
    setTitleOverrides((prev) => setTitleMembers(prev, title, next))
    apiSaveTitleOverrideMembers(title, next).catch((err: unknown) =>
      notifySaveError('出現ソフトの編集', err),
    )
  }

  /** 現在レンダリングされている(表示中の幅に対応する)行要素のみを取得する */
  const getVisibleRows = (): HTMLElement[] => {
    return Array.from(document.querySelectorAll<HTMLElement>('[data-national-no]')).filter(
      (el) => el.offsetParent !== null,
    )
  }

  // ジャンプ後、対象行の上端と画面上部固定欄の間に空ける余白(px)。
  // 「現在どの行が先頭に見えているか」の判定にも同じ値を使い、境界をぶれさせない。
  const STICKY_GAP = 8

  /**
   * 画面上部固定欄に隠れずに完全に見えている先頭行の全国No.を取得する。
   * (見出しの下からわずかに顔を出しているだけの行は「先頭」とみなさない)
   */
  const findTopVisibleNationalNo = (rows: HTMLElement[]): number | null => {
    const boundary = headerHeight + STICKY_GAP - 1
    for (const el of rows) {
      if (el.getBoundingClientRect().top >= boundary) {
        const n = Number(el.dataset.nationalNo)
        return Number.isFinite(n) ? n : null
      }
    }
    return null
  }

  /**
   * ページの最上部/最下部ではなく、全国No.の百の位単位(1〜100, 101〜200, ...)で
   * 前後のブロックの先頭付近までジャンプする。
   * ・下ボタンは常に「次の100番台」の先頭へ移動する。
   * ・上ボタンは、現在位置がそのブロックの先頭ちょうどでなければまずそのブロックの先頭へ戻り、
   *   すでに先頭にいる場合のみひとつ前のブロックへ移動する(音楽プレーヤーの「前へ」ボタンと同じ挙動)。
   *
   * スムーススクロールのアニメーションが終わる前に連続でクリックされると、
   * その瞬間の(アニメーション途中の中途半端な)スクロール位置を測ってしまい、
   * 同じ移動先を再計算して「2回目以降が効かない」ように見えることがあった。
   * そのため、直前に自分でジャンプさせた先(lastJumpNoRef)を覚えておき、
   * その後ユーザーが手動でスクロールしていなければ実測ではなくその値を基準にする。
   */
  const handleJumpByHundred = (direction: 'up' | 'down') => {
    const rows = getVisibleRows()
    if (rows.length === 0) return

    const liveNo = findTopVisibleNationalNo(rows) ?? 1
    const currentNo =
      !userScrolledRef.current && lastJumpNoRef.current !== null ? lastJumpNoRef.current : liveNo

    const currentBlockIndex = Math.floor((currentNo - 1) / 100)
    const blockStartNo = currentBlockIndex * 100 + 1

    const targetNo =
      direction === 'down'
        ? (currentBlockIndex + 1) * 100 + 1
        : currentNo > blockStartNo
          ? blockStartNo
          : Math.max(1, blockStartNo - 100)

    let targetEl = rows.find((el) => {
      const n = Number(el.dataset.nationalNo)
      return Number.isFinite(n) && n >= targetNo
    })
    if (!targetEl) {
      targetEl = direction === 'down' ? rows[rows.length - 1] : rows[0]
    }

    lastJumpNoRef.current = targetNo
    userScrolledRef.current = false
    isProgrammaticScrollRef.current = true

    const y = targetEl.getBoundingClientRect().top + window.scrollY - headerHeight - STICKY_GAP
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })

    const clearProgrammaticFlag = () => {
      isProgrammaticScrollRef.current = false
    }
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', clearProgrammaticFlag, { once: true })
    } else {
      setTimeout(clearProgrammaticFlag, 1000)
    }
  }

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text()
      const imported = parseImportedEntries(text)
      await apiImportEntries(imported)
      setEntries(imported)
      window.alert(`${imported.length}件のデータをインポートしました。`)
    } catch (err) {
      window.alert(`インポートに失敗しました: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        読み込み中...
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">
          データの読み込みに失敗しました。
          <br />
          {loadError}
        </p>
        <button
          type="button"
          className="rounded bg-indigo-600 px-4 py-2 text-sm text-white"
          onClick={() => window.location.reload()}
        >
          再読み込み
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div ref={headerRef} className="sticky top-0 z-20 bg-white pb-2 dark:bg-gray-900">
        <h1 className="mb-4 text-xl font-bold">オシャボ管理</h1>

        {saveError && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            <span>{saveError}</span>
            <button
              type="button"
              className="shrink-0 underline"
              onClick={() => setSaveError(null)}
            >
              閉じる
            </button>
          </div>
        )}

        <Toolbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          titleFilter={titleFilter}
          onTitleFilterChange={setTitleFilter}
          gameTitleGroups={gameTitleGroups}
          onClearFilters={handleClearFilters}
          editMode={editMode}
          onToggleEditMode={() => setEditMode((v) => !v)}
          bulkToggleMode={bulkToggleMode}
          onToggleBulkToggleMode={() => setBulkToggleMode((v) => !v)}
          onOpenRegister={() => setShowRegister(true)}
          onOpenBulkRegister={() => setShowBulkRegister(true)}
          onOpenTitleCuration={() => setShowTitleCuration(true)}
          onExport={() => exportEntriesToFile(entries)}
          onImportFile={handleImportFile}
        />
      </div>

      <PokemonTable
        entries={visibleEntries}
        onSelect={(e) => setSelectedEntryId(e.id)}
        sort={sort}
        onSortColumnClick={handleSortColumnClick}
        onToggleBall={(entry, ballType) => handleToggleBallForEntry(entry.id, ballType)}
        bulkToggleMode={bulkToggleMode}
        onBulkToggle={(entry, makeAllObtained) => handleBulkToggleForEntry(entry.id, makeAllObtained)}
        headerOffset={headerHeight}
      />

      {showRegister && (
        <RegisterModal onClose={() => setShowRegister(false)} onSubmit={handleRegisterSingle} />
      )}
      {showBulkRegister && (
        <BulkRegisterModal
          onClose={() => setShowBulkRegister(false)}
          onSubmit={handleRegisterBulk}
          registeredIds={registeredIds}
        />
      )}
      {showTitleCuration && (
        <TitleCurationModal
          onClose={() => setShowTitleCuration(false)}
          allTitles={allKnownTitles}
          overrides={titleOverrides}
          onSave={handleSaveTitleOverride}
        />
      )}
      {selectedEntry && (
        <DetailModal
          entry={selectedEntry}
          hasRealData={registeredByPokemonId.has(selectedEntry.pokemonId)}
          allTitles={allKnownTitles}
          titleOverrides={titleOverrides}
          onClose={() => setSelectedEntryId(null)}
          onToggleBall={handleToggleBall}
          onToggleTitle={handleToggleTitleForPokemon}
          onSave={handleSaveDetail}
          onDelete={handleDelete}
        />
      )}

      {/* ページの最上部・最下部にいる間は非表示(押しても意味がないため)。
          少しでもスクロールして端から離れると再表示する。完全に消すのではなく
          transitionで滑らかにフェード+クリック無効化することで、表示の変化が唐突にならないようにしている */}
      <div
        className={`fixed bottom-6 right-6 z-50 flex flex-col gap-2 transition-opacity duration-200 ${
          showJumpButtons ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!showJumpButtons}
      >
        <button
          type="button"
          aria-label="前の100番台へ"
          title="前の100番台へ"
          tabIndex={showJumpButtons ? 0 : -1}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg hover:bg-sky-600"
          onClick={() => handleJumpByHundred('up')}
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="次の100番台へ"
          title="次の100番台へ"
          tabIndex={showJumpButtons ? 0 : -1}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg hover:bg-sky-600"
          onClick={() => handleJumpByHundred('down')}
        >
          ▼
        </button>
      </div>
    </div>
  )
}
