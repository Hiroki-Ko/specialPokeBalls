# specialPokeBalls(オシャボ管理アプリ)

推し活ならぬ「推しボール(オシャレボール/オシャボ)」の入手状況を管理するための個人用Webアプリです。仕様は [SPEC.md](./SPEC.md) を参照してください。

## セットアップ

```
npm install
npm run dev
```

## ポケモンマスタデータの生成

一覧に表示されるポケモン自体の情報(全国No.・ポケモン名・フォルム・タマゴグループ・孵化までの必要歩数・夢特性・登場ゲームタイトル)は、PokéAPIから生成した `src/data/pokemonMaster.json` を参照しています。

現在入っているのは動作確認用のサンプルデータ(数匹分のみ)です。実際に使う際は、以下のコマンドで最新のマスタデータを生成してください(インターネット接続が必要です)。

```
node scripts/generate-pokemon-master.mjs
```

主なオプション:

- `--start` / `--end`: 生成対象の全国No.の範囲(省略時は1〜1025)
- `--out`: 出力先パス(省略時は `src/data/pokemonMaster.json`)
- `--concurrency`: 並列リクエスト数(省略時は8)

例: 第1世代だけ試しに生成する場合

```
node scripts/generate-pokemon-master.mjs --start 1 --end 151
```

収録範囲・生成方法の詳細はSPEC.md 6.2、およびスクリプト冒頭のコメントを参照してください。生成には数分〜(範囲によっては)数十分かかることがあります。

## ビルド・デプロイ

```
npm run build
```

`vite.config.ts` の `base` をリポジトリ名(`/specialPokeBalls/`)に設定済みなので、`dist` の中身をGitHub Pagesで公開する想定です。

## データの保存場所

ユーザーが登録したオシャボの内容(OshaboEntry)は、ブラウザのlocalStorageに保存されます。バックアップ・他端末への移行にはアプリ内の「エクスポート」「インポート」機能を使ってください。
