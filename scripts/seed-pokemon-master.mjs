#!/usr/bin/env node
// scripts/generate-pokemon-master.mjs で生成した src/data/pokemonMaster.json を、
// Cloudflare D1のpokemon_masterテーブルへ投入するためのSQLファイル(pokemon_master_seed.sql)を
// プロジェクトルートに生成する。
//
// 使い方:
//   node scripts/seed-pokemon-master.mjs [--force]
//   その後、以下のいずれかでD1に反映する(package.jsonのnpm scriptsからも実行可能):
//     wrangler d1 execute DB --local  --file=pokemon_master_seed.sql   (ローカル動作確認用)
//     wrangler d1 execute DB --remote --file=pokemon_master_seed.sql   (本番反映)
//
// 実行のたびに既存のpokemon_masterテーブルを全件削除してから入れ直す
// (マスタデータは常に生成結果で丸ごと置き換える想定のため)。
//
// 安全装置:
// 何らかの不具合(PokéAPI側の障害・ネットワーク不調等)でpokemonMaster.jsonが
// 前回より大幅に少ない件数しか無い状態のまま、それに気付かずD1へ丸ごと反映してしまうと
// 既存のマスタデータが誤って大量に消えてしまう。それを防ぐため、前回成功時の件数を
// scripts/pokemon-master-seed-state.json に記録しておき、件数が前回の90%を下回る場合は
// SQL生成を中断する(意図的な変更だと分かっている場合のみ --force で強制続行できる)。

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const inputPath = path.join(__dirname, '..', 'src', 'data', 'pokemonMaster.json')
const outputPath = path.join(__dirname, '..', 'pokemon_master_seed.sql')
const statePath = path.join(__dirname, 'pokemon-master-seed-state.json')
const force = process.argv.includes('--force')

const data = JSON.parse(readFileSync(inputPath, 'utf8'))

if (!Array.isArray(data)) {
  console.error('pokemonMaster.jsonが配列ではありません')
  process.exit(1)
}

const MIN_RATIO = 0.9 // 前回件数の90%を下回ったら異常とみなす

if (existsSync(statePath)) {
  const prevState = JSON.parse(readFileSync(statePath, 'utf8'))
  const prevCount = prevState.count ?? 0
  if (prevCount > 0 && data.length < prevCount * MIN_RATIO && !force) {
    console.error(
      `[ABORT] pokemonMaster.jsonの件数が前回より大幅に減っています` +
        `(前回 ${prevCount}件 → 今回 ${data.length}件)。\n` +
        'generate-pokemon-master.mjs の実行時にPokéAPI側の取得が一部失敗した可能性があります。\n' +
        '意図した変更(収録範囲・除外条件の変更など)であると確認できた場合のみ、' +
        '--force を付けて再実行してください。',
    )
    process.exit(1)
  }
}

/** SQLite向けの文字列リテラルエスケープ(nullはSQLのNULLに変換) */
function sqlString(value) {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'NULL'
  return String(Number(value))
}

const lines = [
  '-- scripts/seed-pokemon-master.mjs により自動生成。手動編集しないこと。',
  'DELETE FROM pokemon_master;',
]

for (const p of data) {
  lines.push(
    `INSERT INTO pokemon_master (id, national_no, name, form_name, egg_groups, hatch_steps, hidden_ability, game_titles, sprite_id) VALUES (` +
      [
        sqlString(p.id),
        sqlNumber(p.nationalNo),
        sqlString(p.name),
        sqlString(p.formName),
        sqlString(JSON.stringify(p.eggGroups ?? [])),
        sqlNumber(p.hatchSteps),
        sqlString(p.hiddenAbility),
        sqlString(JSON.stringify(p.gameTitles ?? [])),
        sqlNumber(p.spriteId),
      ].join(', ') +
      ');',
  )
}

writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8')
writeFileSync(
  statePath,
  JSON.stringify({ count: data.length, generatedAt: new Date().toISOString() }, null, 2) + '\n',
  'utf8',
)
console.log(`${data.length}件のポケモンマスタを ${path.relative(process.cwd(), outputPath)} に書き出しました。`)
