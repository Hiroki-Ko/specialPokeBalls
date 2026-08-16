# specialPokeBalls(オシャボ管理アプリ)

推し活ならぬ「推しボール(オシャレボール/オシャボ)」の入手状況を管理するための個人用Webアプリです。仕様は [SPEC.md](./SPEC.md) を参照してください。

> **作業前に必読:** このリポジトリは複数回のセッションにまたがって開発されており、過去の設計判断の経緯(なぜ今の仕様になっているか)や修正履歴は [`PROJECT_LOG.md`](./PROJECT_LOG.md) にまとめてあります。AI(Claude等)にこのリポジトリの作業を依頼する際は、まず `PROJECT_LOG.md` を読んでもらってください(Claude Codeの場合は [`CLAUDE.md`](./CLAUDE.md) が自動的にその旨を指示します)。重要な仕様変更を行った場合は `PROJECT_LOG.md` への追記もあわせて依頼してください。

## アーキテクチャ概要

- フロントエンド: Vite + React + TypeScript + Tailwind CSS
- バックエンド: Cloudflare Pages Functions(`functions/api/` 配下、ファイルベースルーティング)
- データ保存先: Cloudflare D1(SQLite互換)。`entries`(登録済みオシャボ)・`ball_statuses`・`title_overrides`・`pokemon_master`(図鑑データ本体)の4テーブル
- デプロイ先: Cloudflare Pages(GitHubリポジトリと連携し、pushで自動デプロイ)

ポケモンマスタ(図鑑データ)を含め、永続データはすべてD1に保存されています。localStorageは使用していません。

## セットアップ

```
npm install
```

### ローカルでのD1初期セットアップ(初回のみ)

```
npm run d1:migrate:local     # ローカルのD1(エミュレーション)にテーブルを作成
npm run d1:seed-master:local # ポケモンマスタデータを投入(src/data/pokemonMaster.json から)
```

リモート(Cloudflare上の本番D1)へも同様に `d1:migrate:remote` / `d1:seed-master:remote` を使います。

### 開発サーバーの起動

このアプリは `/api/*` へのリクエスト(D1)を伴うため、**`npm run dev` だけではAPIが動かず、画面が正しく表示されません**(Viteの開発サーバー単体にはCloudflare Pages Functions・D1の機能がないため)。

- `npm run dev:full` — ビルド後、`wrangler pages dev` でFunctions・D1(ローカルエミュレーション)込みで起動します。実際の動作確認にはこちらを使ってください。ポート8799を明示的に指定しているので [http://localhost:8799](http://localhost:8799) で確認できます(他のプロジェクトのdevサーバーとポートが衝突しないよう、あえてデフォルトの8788から変更しています)。
- コードを編集して確認し直したい場合は、以下の2つを別々のターミナルで同時に動かすと、保存するたびに自動でビルド・ブラウザがリロードされます。
  ```
  npm run watch       # ターミナル1: ソース変更を検知して dist/ を自動ビルド
  npm run dev:full     # ターミナル2: wrangler pages dev(--live-reload)でdist/を配信
  ```
- `npm run dev`(Viteのみ)は、APIを使わない見た目・レイアウトだけのクイックな確認用途に限り使えます。

## ポケモンマスタデータの生成

一覧に表示されるポケモン自体の情報(全国No.・ポケモン名・フォルム・タマゴグループ・孵化までの必要歩数・夢特性・登場ゲームタイトル)は、PokéAPIから生成した `src/data/pokemonMaster.json` を元にD1の `pokemon_master` テーブルへ投入したものです。

新しいソフトの発売などで対象ポケモンを追加したい場合は、以下の手順で再生成・再投入します。

```
node scripts/generate-pokemon-master.mjs   # src/data/pokemonMaster.json を再生成(インターネット接続が必要)
npm run d1:seed-master:remote               # 本番D1へ反映(既存データはいったん全削除して入れ直し)
```

主なオプション:

- `--start` / `--end`: 生成対象の全国No.の範囲(省略時は1〜1025)
- `--out`: 出力先パス(省略時は `src/data/pokemonMaster.json`)
- `--concurrency`: 並列リクエスト数(省略時は8)
- `--allow-partial`: PokéAPI側のエラー等で一部の種の取得に失敗した場合でも、強制的に出力する

収録範囲・生成方法の詳細はSPEC.md 6.2、およびスクリプト冒頭のコメントを参照してください。生成には数分〜(範囲によっては)数十分かかることがあります。

### 安全装置(不完全なデータで上書きしないための仕組み)

ネットワーク不調やPokéAPI側の一時的な障害で一部の種の取得に失敗すると、そのままでは「本来より大幅に少ない件数」のデータで`pokemonMaster.json`やD1本体を上書きしてしまう恐れがあります。これを防ぐため、2段階のチェックを入れています。

1. `generate-pokemon-master.mjs`: 取得失敗が全体の5%を超えた場合、`pokemonMaster.json`への書き込みを中止します(既存のファイルはそのまま残ります)。意図的に不完全な結果で構わない場合のみ `--allow-partial` を付けて再実行してください。
2. `npm run seed:pokemon-master`(`d1:seed-master:local` / `d1:seed-master:remote` にも含まれます): 前回成功時の件数を `scripts/pokemon-master-seed-state.json` に記録しており、今回の件数がその90%を下回ると中止します。収録範囲や除外条件を意図的に変更して件数が減った場合のみ `npm run seed:pokemon-master -- --force` のように `--force` を付けて再実行してください。

いずれも中断した場合はD1への反映コマンド自体が実行されない(`&&` でチェーンしているため)ので、本番データが壊れることはありません。

新しいゲームタイトルそのものの追加や、PokéAPI側のデータ不足(第7世代以降の出現データ欠落など)を補うための「そのタイトルで捕獲可能なポケモン」の手動登録は、アプリ内の「編集」→「ゲームタイトル手動登録」から行えます。絞り込みのゲームタイトル一覧にも、ここで入力した新しいタイトル名がそのまま反映されます。

## ビルド・デプロイ

```
npm run build
```

Cloudflare Pagesがリポジトリと連携しており、`main` ブランチへのpushで自動的にビルド・デプロイされます(ビルド出力: `dist`)。D1バインディング(`DB`)はCloudflareダッシュボードのPagesプロジェクト設定、または `wrangler.toml` の `[[d1_databases]]` で管理しています。

## データの保存場所

ユーザーが登録したオシャボの内容(OshaboEntry)・ポケモンマスタ・ゲームタイトル手動登録情報は、すべてCloudflare D1に保存されます。バックアップ・他端末への移行にはアプリ内の「エクスポート」「インポート」機能(オシャボ登録データ側のみが対象)も使えます。
