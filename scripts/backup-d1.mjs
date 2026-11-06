#!/usr/bin/env node
// 本番(または開発用ローカル)D1データベースの丸ごとバックアップを取る。
// スキーマ・データの両方を含む単一のSQLファイルとして backups/ 配下に書き出す
// (`wrangler d1 export` をラップしているだけ。中身はいつでもこのSQLを
// `wrangler d1 execute DB --remote --file=...` で流し込めば復元できる形式)。
//
// 使い方:
//   npm run d1:backup:remote   … 本番D1をバックアップ(このコマンドはCloudflareに
//                                 ログイン済みのマシン(=ユーザーの手元PC)で実行すること。
//                                 このプロジェクトのクラウド作業環境ではwranglerが
//                                 未認証のため実行できない)
//   npm run d1:backup:local    … ローカル開発用D1(wrangler dev/pages devが使うもの)をバックアップ
//
// ファイル名にはUTC日時を付与し、実行のたびに新しいファイルを作る(上書きしない)。
// バックアップは個人のポケモン収集データを含むため、.gitignoreでリポジトリには
// コミットしない設定にしてある(手元に保管するか、別途安全な場所に退避すること)。

import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(__dirname, '..')
const backupDir = path.join(projectRoot, 'backups')

const remote = process.argv.includes('--remote')
const target = remote ? '--remote' : '--local'

mkdirSync(backupDir, { recursive: true })

// ファイル名に使えない記号(:)を除いたUTCタイムスタンプ
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const outFile = path.join(backupDir, `d1-backup-${remote ? 'remote' : 'local'}-${timestamp}.sql`)

console.log(`D1(${remote ? '本番/remote' : 'ローカル/local'})を ${outFile} へエクスポートします...`)

try {
  execSync(`npx wrangler d1 export DB ${target} --output="${outFile}" -y`, {
    stdio: 'inherit',
    cwd: projectRoot,
  })
} catch {
  console.error('バックアップに失敗しました。')
  if (remote) {
    console.error('wrangler未ログインの場合は `npx wrangler login` を実行してから再度お試しください。')
  }
  process.exit(1)
}

console.log(`完了しました: ${outFile}`)
