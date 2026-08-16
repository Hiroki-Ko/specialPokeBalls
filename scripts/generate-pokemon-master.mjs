#!/usr/bin/env node
/**
 * SPEC.md 6.2 に基づき、PokéAPI からポケモンマスタの静的JSONを生成するスクリプト。
 *
 * 収録範囲(6.2.1):
 *   - 進化ライン(無進化を含む)の最初の姿のみ(species.evolves_from_species が null のもののみ)
 *   - リージョンフォームはそれぞれ独立したポケモンとして収録
 *   - メガシンカ・ゲンシカイキ・キョダイマックス等は除外
 *   - タマゴグループが「タマゴみはっけん」のみ、かつ進化ライン自体を持たない(誰にも進化しない)種は除外
 *
 * gameTitlesはVERSION_JAの登録順(=発売順)に揃えて出力する。
 *
 * データソース: PokéAPI (https://pokeapi.co/)
 * 参考記事: https://takosavi.hatenablog.com/entry/2024/12/30/001209
 *
 * 使い方:
 *   node scripts/generate-pokemon-master.mjs [--start 1] [--end 1025] [--out src/data/pokemonMaster.json] [--concurrency 8] [--allow-partial]
 *
 * 安全装置:
 *   PokéAPIへの個別リクエストが失敗した種(species)は警告を出しつつスキップする仕様だが、
 *   スキップ率が5%を超える場合は「ネットワーク不調等で不完全なデータしか取れなかった」
 *   可能性が高いとみなし、出力ファイルを上書きせずに中断する(既存のファイルはそのまま残る)。
 *   意図的に不完全な結果でよい場合のみ --allow-partial を付けて実行する。
 *
 * 実装メモ:
 *   実際の並列数制限は fetchJson() の内部(HTTPリクエストを行う最下層)でのみ行う。
 *   種(species)単位の処理を limiter でラップしてしまうと、外側のタスクが
 *   自分の内側で使う limiter の枠を奪い合ってデッドロックする(全タスクが
 *   お互いの完了待ちで止まる)ため、意図的に「末端のfetchだけを絞る」構造にしている。
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const API_BASE = 'https://pokeapi.co/api/v2'

// PokéAPIのバージョンslug -> 日本語タイトル名。
// 新タイトル発売時や、古いタイトルの表記を見直したい場合はここを更新する。
// キーは(ハイフンを含むものが混在するため)すべてクォートで統一している。
const VERSION_JA = {
  'red': '赤',
  'green': '緑',
  'blue': '青',
  'yellow': 'ピカチュウ',
  'gold': '金',
  'silver': '銀',
  'crystal': 'クリスタル',
  'ruby': 'ルビー',
  'sapphire': 'サファイア',
  'emerald': 'エメラルド',
  'firered': 'ファイアレッド',
  'leafgreen': 'リーフグリーン',
  'diamond': 'ダイヤモンド',
  'pearl': 'パール',
  'platinum': 'プラチナ',
  'heartgold': 'ハートゴールド',
  'soulsilver': 'ソウルシルバー',
  'black': 'ブラック',
  'white': 'ホワイト',
  'black-2': 'ブラック2',
  'white-2': 'ホワイト2',
  'x': 'X',
  'y': 'Y',
  'omega-ruby': 'オメガルビー',
  'alpha-sapphire': 'アルファサファイア',
  'sun': 'サン',
  'moon': 'ムーン',
  'ultra-sun': 'ウルトラサン',
  'ultra-moon': 'ウルトラムーン',
  'lets-go-pikachu': "Let's Go! ピカチュウ",
  'lets-go-eevee': "Let's Go! イーブイ",
  'sword': 'ソード',
  'shield': 'シールド',
  'brilliant-diamond': 'ブリリアントダイヤモンド',
  'shining-pearl': 'シャイニングパール',
  'legends-arceus': 'Legends アルセウス',
  'scarlet': 'スカーレット',
  'violet': 'バイオレット',
  'za': 'Legends ZA',
}

// PokéAPI上は「バージョン」として存在するが、本アプリの収録対象外とする外伝・周辺タイトル。
// ここに含まれるバージョンslugはgameTitlesに一切含めない(翻訳もしない)。
const EXCLUDED_VERSION_SLUGS = new Set([
  'colosseum',
  'xd',
  'stadium',
  'stadium-2',
  'pokemon-go',
  'lets-go-pikachu-lets-go-eevee', // version-group名が誤って渡ってきた場合の保険
])

// PokéAPIのタマゴグループslug -> 日本語名。
// タマゴグループは15種で固定(今後増える予定はない)ため、PokéAPI側の翻訳データに頼らず
// 決め打ちのテーブルとして持つ(egg-groupエンドポイントのnamesには日本語が入っていないため)。
const EGG_GROUP_JA = {
  monster: 'かいじゅう',
  water1: 'すいちゅう1',
  bug: 'こんちゅう',
  flying: 'ひこう',
  ground: 'りくじょう',
  fairy: 'ようせい',
  plant: 'しょくぶつ',
  humanshape: 'ひとがた',
  water3: 'すいちゅう3',
  mineral: 'こうぶつ',
  indeterminate: 'ふていけい',
  water2: 'すいちゅう2',
  ditto: 'メタモン',
  dragon: 'ドラゴン',
  'no-eggs': 'タマゴみはっけん',
}

/**
 * DLC版の出現バージョン(例: "the-isle-of-armor-sword")や、日本版のみの旧タイトル
 * (例: "red-japan")を、基本のゲームタイトルに畳み込む。
 * 完全な一覧をこちらで把握しきれないため、パターンで判定できるものはここで吸収し、
 * それでも分からないものだけ /version/{slug} を実際に問い合わせて確認する。
 */
function resolveKnownVersionSlug(slug) {
  if (VERSION_JA[slug]) return VERSION_JA[slug]

  const dlcBaseBySuffix = ['sword', 'shield', 'scarlet', 'violet']
  for (const base of dlcBaseBySuffix) {
    if (slug !== base && slug.endsWith(`-${base}`) && VERSION_JA[base]) return VERSION_JA[base]
  }

  if (slug.endsWith('-japan')) {
    const base = slug.slice(0, -'-japan'.length)
    if (VERSION_JA[base]) return VERSION_JA[base]
  }

  return null
}

/**
 * バージョンslugを日本語タイトル名に翻訳する。
 * 収録対象外(外伝作品等)は null を返し、呼び出し側でgameTitlesから除外する。
 * VERSION_JA・DLCパターン・日本版パターンのいずれにも一致しない未知のslugは、
 * 本当に新タイトルの可能性があるため実際に /version/{slug} へ問い合わせて翻訳を試みるが、
 * 見落とし(除外漏れ・翻訳表の更新漏れ)に気付けるよう警告ログを出す。
 */
async function getVersionNameJa(slug) {
  if (EXCLUDED_VERSION_SLUGS.has(slug)) return null

  const known = resolveKnownVersionSlug(slug)
  if (known) return known

  console.warn(
    `  [warn] 未知のバージョンslug: ${slug} (VERSION_JA/EXCLUDED_VERSION_SLUGSの更新が必要な可能性があります。API経由で翻訳を試みます)`,
  )
  try {
    const data = await fetchJson(`${API_BASE}/version/${slug}`)
    return jaName(data.names, 'ja', 'ja-Hrkt') ?? slug
  } catch {
    return slug
  }
}

// 収録対象外とする姿(名前の末尾パターン)
const EXCLUDED_FORM_PATTERNS = [
  /-mega/,
  /-primal/,
  /-gmax$/,
  /-totem/,
  /-cap$/,
  /-starter$/,
  /-battle-bond$/,
  /-ash$/,
  /-eternamax$/,
]

// 収録対象とするリージョンフォームの接尾辞と、その日本語ラベル
const REGIONAL_FORM_LABELS = {
  '-alola': 'アローラのすがた',
  '-galar': 'ガラルのすがた',
  '-hisui': 'ヒスイのすがた',
  '-paldea': 'パルデアのすがた',
}

const cache = new Map()

// 実際にネットワークへ出るのはここだけ。concurrency の制限もここで行う。
let limit = (fn) => fn()
const MAX_RETRIES = 3

async function fetchJsonUncached(url) {
  let lastErr
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`fetch failed: ${url} (${res.status})`)
      return await res.json()
    } catch (err) {
      lastErr = err
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 300 * attempt))
      }
    }
  }
  throw lastErr
}

async function fetchJson(url) {
  if (cache.has(url)) return cache.get(url)
  const promise = limit(() => fetchJsonUncached(url))
  cache.set(url, promise)
  // 失敗した場合は次回リトライできるようキャッシュから外す
  promise.catch(() => cache.delete(url))
  return promise
}

function jaName(namesArray, ...langCodesInPriorityOrder) {
  for (const code of langCodesInPriorityOrder) {
    const hit = namesArray.find((n) => n.language.name === code)
    if (hit) return hit.name
  }
  return null
}

function getEggGroupNameJa(slug) {
  if (EGG_GROUP_JA[slug]) return EGG_GROUP_JA[slug]
  console.warn(`  [warn] 未知のタマゴグループ slug: ${slug}(EGG_GROUP_JAに追加してください)`)
  return slug
}

// VERSION_JAの登録順(=発売順)をタイトルの正規の並び順として扱う。
const VERSION_ORDER = Object.values(VERSION_JA)

/**
 * gameTitlesをVERSION_JAの並び順(発売順)に揃える。
 * VERSION_JA/EXCLUDED_VERSION_SLUGSのどちらにも該当しない未知のタイトル(ライブAPI経由で
 * 翻訳したもの)は順序が分からないため、既知のタイトルの後ろにアルファベット順で並べる。
 */
function sortTitlesByVersionOrder(titles) {
  return [...titles].sort((a, b) => {
    const ia = VERSION_ORDER.indexOf(a)
    const ib = VERSION_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'ja')
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

async function getAbilityNameJa(slug) {
  const data = await fetchJson(`${API_BASE}/ability/${slug}`)
  return jaName(data.names, 'ja', 'ja-Hrkt') ?? slug
}

async function getFormNameJa(pokemonName) {
  try {
    const data = await fetchJson(`${API_BASE}/pokemon-form/${pokemonName}`)
    return jaName(data.form_names, 'ja', 'ja-Hrkt')
  } catch {
    return null
  }
}

function isExcludedVariety(varietyName, speciesName) {
  if (varietyName === speciesName) return false
  return EXCLUDED_FORM_PATTERNS.some((re) => re.test(varietyName))
}

function regionalSuffixOf(varietyName) {
  return Object.keys(REGIONAL_FORM_LABELS).find((suffix) => varietyName.endsWith(suffix)) ?? null
}

/** 簡易的な並列数制限(外部パッケージを使わず実装)。fetchJson からのみ利用する。 */
function createLimiter(concurrency) {
  let active = 0
  const queue = []
  const runNext = () => {
    if (active >= concurrency || queue.length === 0) return
    active++
    const { fn, resolve, reject } = queue.shift()
    fn()
      .then(resolve, reject)
      .finally(() => {
        active--
        runNext()
      })
  }
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject })
      runNext()
    })
}

async function buildMasterForVariety(species, variety, hatchSteps, eggGroupNames) {
  const pokemonName = variety.pokemon.name
  const pokemonData = await fetchJson(variety.pokemon.url)

  const hiddenAbilityEntry = pokemonData.abilities.find((a) => a.is_hidden)
  const hiddenAbility = hiddenAbilityEntry
    ? await getAbilityNameJa(hiddenAbilityEntry.ability.name)
    : null

  // 登場ゲームタイトル(野生出現のみ)。/encounters は野生の出現ロケーションのみを返すため、
  // 配布・イベント限定入手は含まれない(6.2.2)。
  // 既知の制約: PokéAPI自体が第7世代(サン・ムーン)以降のロケーションエリア出現データを
  // 十分に持っていない(コミュニティでも既知の欠落 → https://github.com/PokeAPI/pokeapi/discussions/958)。
  // そのため Let's Go / ソード・シールド / BDSP / Legends シリーズ / スカーレット・バイオレット等では
  // 実際に野生出現するにも関わらずgameTitlesに載らないポケモンが一定数発生し得る(スクリプト側のバグではない)。
  const encounters = await fetchJson(`${API_BASE}/pokemon/${pokemonData.id}/encounters`)
  const versionSlugs = new Set()
  for (const loc of encounters) {
    for (const vd of loc.version_details) {
      versionSlugs.add(vd.version.name)
    }
  }
  const translatedTitles = await Promise.all([...versionSlugs].map((slug) => getVersionNameJa(slug)))
  const gameTitles = sortTitlesByVersionOrder([...new Set(translatedTitles.filter((t) => t !== null))])

  let formName = null
  if (!variety.is_default) {
    const regionalSuffix = regionalSuffixOf(pokemonName)
    formName =
      (regionalSuffix && REGIONAL_FORM_LABELS[regionalSuffix]) ??
      (await getFormNameJa(pokemonName)) ??
      pokemonName
  }

  return {
    id: pokemonName,
    nationalNo: species.id,
    name: jaName(species.names, 'ja-Hrkt', 'ja') ?? species.name,
    formName,
    eggGroups: eggGroupNames,
    hatchSteps,
    hiddenAbility,
    gameTitles,
    // 画像表示用。PokéAPI内部のポケモンID(フォルム違いは全国No.と別の値を持つ)
    spriteId: pokemonData.id,
  }
}

/** 進化ライン自体を持たない(このポケモンからは誰にも進化しない)かどうかを判定する */
async function doesNotEvolveFurther(species) {
  try {
    const chain = await fetchJson(species.evolution_chain.url)
    return chain.chain.evolves_to.length === 0
  } catch {
    // 判定できない場合は安全側に倒し、除外しない
    return false
  }
}

async function processSpecies(entry) {
  const species = await fetchJson(entry.pokemon_species.url)

  // 6.2.1: 進化ライン(無進化を含む)の最初の姿のみを収録対象とする
  if (species.evolves_from_species !== null) return []

  const eggGroupSlugs = species.egg_groups.map((eg) => eg.name)

  // タマゴグループが「タマゴみはっけん」のみ、かつ進化しない(進化ライン自体を持たない)種は
  // タマゴ・孵化にまつわる収集要素と無縁のため収録対象から除外する(伝説・幻のポケモン等を想定)
  if (eggGroupSlugs.length === 1 && eggGroupSlugs[0] === 'no-eggs' && (await doesNotEvolveFurther(species))) {
    return []
  }

  const hatchSteps = (species.hatch_counter + 1) * 255
  const eggGroupNames = eggGroupSlugs.map((slug) => getEggGroupNameJa(slug))

  const varieties = species.varieties.filter((variety) => {
    if (isExcludedVariety(variety.pokemon.name, species.name)) return false
    if (!variety.is_default && !regionalSuffixOf(variety.pokemon.name)) return false
    return true
  })

  return Promise.all(
    varieties.map((variety) => buildMasterForVariety(species, variety, hatchSteps, eggGroupNames)),
  )
}

async function main() {
  const args = process.argv.slice(2)
  const getArg = (flag, def) => {
    const i = args.indexOf(flag)
    return i >= 0 ? args[i + 1] : def
  }
  const start = Number(getArg('--start', '1'))
  const end = Number(getArg('--end', '1025'))
  const outPath = getArg('--out', 'src/data/pokemonMaster.json')
  const concurrency = Number(getArg('--concurrency', '8'))
  const allowPartial = args.includes('--allow-partial')

  limit = createLimiter(concurrency)

  console.log('Fetching national pokedex list...')
  const pokedex = await fetchJson(`${API_BASE}/pokedex/national`)
  const entries = pokedex.pokemon_entries.filter(
    (e) => e.entry_number >= start && e.entry_number <= end,
  )
  console.log(`Processing ${entries.length} national dex entries (No.${start}-${end})...`)

  const startedAt = Date.now()
  let done = 0
  const failures = []

  const speciesResults = await Promise.all(
    entries.map(async (entry) => {
      try {
        const r = await processSpecies(entry)
        return r
      } catch (err) {
        failures.push({ entry: entry.pokemon_species.name, error: err.message })
        return []
      } finally {
        done++
        if (done % 20 === 0 || done === entries.length) {
          const elapsedSec = Math.round((Date.now() - startedAt) / 1000)
          console.log(`  ${done}/${entries.length} species processed (${elapsedSec}s elapsed)`)
        }
      }
    }),
  )

  const result = speciesResults.flat()
  result.sort((a, b) => a.nationalNo - b.nationalNo || a.id.localeCompare(b.id))

  // 一部の種(species)取得がネットワークエラー等で失敗すると、そのままでは「一部だけ取れた
  // 不完全なデータ」でも黙って出力ファイルを上書きしてしまう。それを防ぐため、失敗率が
  // 閾値を超える場合は出力せずに中断する(--allow-partial を付けた場合のみ強制的に出力する)。
  const FAILURE_RATE_THRESHOLD = 0.05 // 5%を超える種の取得失敗があれば異常とみなす
  const failureRate = entries.length > 0 ? failures.length / entries.length : 0

  if (failures.length > 0) {
    console.warn(`\n${failures.length}/${entries.length} species failed and were skipped:`)
    for (const f of failures.slice(0, 20)) {
      console.warn(`  - ${f.entry}: ${f.error}`)
    }
    if (failures.length > 20) console.warn(`  ...and ${failures.length - 20} more`)
  }

  if (failureRate > FAILURE_RATE_THRESHOLD && !allowPartial) {
    console.error(
      `\n[ABORT] 失敗率が高すぎるため ${outPath} への書き込みを中止しました` +
        `(${failures.length}/${entries.length} 件失敗 = ${(failureRate * 100).toFixed(1)}%、` +
        `閾値 ${(FAILURE_RATE_THRESHOLD * 100).toFixed(0)}%)。\n` +
        'PokéAPI側の一時的な障害やネットワーク不調の可能性があります。時間をおいて再実行してください。\n' +
        'この不完全な結果でよいと分かっている場合のみ、--allow-partial を付けて再実行すると強制的に出力します。',
    )
    process.exitCode = 1
    return
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, JSON.stringify(result, null, 2) + '\n', 'utf-8')
  console.log(
    `Wrote ${result.length} records to ${outPath}` +
      (failures.length > 0 ? ` (${failures.length}/${entries.length} species skipped due to errors)` : ''),
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
