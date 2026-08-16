#!/usr/bin/env node
// scripts/generate-pokemon-master.mjs で生成した src/data/pokemonMaster.json を、
// Cloudflare D1のpokemon_masterテーブルへ投入するためのSQLファイル(pokemon_master_seed.sql)を
// プロジェクトルートに生成する。
//
// 使い方:
//   node scripts/seed-pokemon-master.mjs
//   その後、以下のいずれかでD1に反映する(package.jsonのnpm scriptsからも実行可能):
//     wrangler d1 execute DB --local  --file=pokemon_master_seed.sql   (ローカル動作確認用)
//     wrangler d1 execute DB --remote --file=pokemon_master_seed.sql   (本番反映)
//
// 実行のたびに既存のpokemon_masterテーブルを全件削除してから入れ直す
// (マスタデータは常に生成結果で丸ごと置き換える想定のため)。

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const inputPath = path.join(__dirname, '..', 'src', 'data', 'pokemonMaster.json')
const outputPath = path.join(__dirname, '..', 'pokemon_master_seed.sql')

const data = JSON.parse(readFileSync(inputPath, 'utf8'))

if (!Array.isArray(data)) {
  console.error('pokemonMaster.jsonが配列ではありません')
  process.exit(1)
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
console.log(`${data.length}件のポケモンマスタを ${path.relative(process.cwd(), outputPath)} に書き出しました。`)
