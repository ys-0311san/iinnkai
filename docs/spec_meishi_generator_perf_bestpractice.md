# 名刺ジェネレーター 軽量化・高速起動 ベストプラクティス適用仕様書

## 背景
`print-card/generator/`（RenderにデプロイするFlask名刺ジェネレーター）について、実測に基づき以下の無駄が見つかった。パフォーマンス・軽量化のベストプラクティスとして修正する。

## 前提・制約（変更禁止）
- `print-card/build.py` / `print-card/generate_background.py` には一切手を加えない。
- `print-card/generator/card_builder.py` の**PDFの見た目・レイアウト・生成結果は一切変更しない**。今回はあくまで「同じ結果を、もっと速く・無駄なく」出すためのリファクタリング。
- `print-card/generator/app.py` のFlaskルーティング・バリデーションロジックは変更しない。

## 修正1: フォント登録をリクエスト毎から起動時1回に変更（最重要）

### 現状の問題
`print-card/generator/card_builder.py` の `generate_pdf()` 関数が、呼ばれるたび（＝POST `/generate` リクエストのたび）に `_register_all_preset_fonts()` を呼んでいる。この関数は5書体すべてのTTFファイルを毎回reportlabの `pdfmetrics.registerFont(TTFont(...))` で再パース・再登録している。

実測（同一プロセス内で複数回呼び出し）:
- 1回目: 354ms
- 2回目: 197ms
- 3回目: 167ms

つまり同一プロセスが生きている間、無意味に毎リクエスト150〜350msを消費している（PDF生成全体が2.2〜2.5秒程度なので、その1〜2割にあたる）。reportlabの`registerFont`はTTFontオブジェクトのパースをキャッシュしないため、呼ぶたびにファイルI/O+パースが発生する。

### 修正内容
`_register_all_preset_fonts()` の呼び出しを、リクエスト処理のたび（`generate_pdf()`内）ではなく、**プロセス起動時（モジュールimport時）に1回だけ**実行するように変更する。

具体的には:
1. `card_builder.py` に登録済みフラグを持たせるか、モジュールレベルで一度だけ実行するようにする（例: モジュールの末尾、または `_ensure_assets()` 実行後の適切な位置でトップレベルコードとして1回呼ぶ。ただし `_register_all_preset_fonts()` は `FONTS` ディレクトリのファイルに依存するため、`download_fonts()` が完了済みであることが前提になる点に注意。現状 `app.py` がimport時点で `download_fonts()` を呼んでいるので、`card_builder`のフォント登録はそれより後、かつ確実に1回だけ走るタイミングにすること）。
2. `generate_pdf()` 内の既存の `_register_all_preset_fonts()` 呼び出しは削除する（二重登録・毎回実行を防ぐため）。
3. 万one、フォントファイルがまだ存在しないタイミングでモジュールがimportされるケース（フラットな環境等）に備え、遅延初期化（初回の`generate_pdf()`呼び出し時にまだ登録されていなければ登録する、以降はスキップするフラグ管理）でも良い。要は「プロセス生存中に最大1回しか重い登録処理をしない」ことが目的。
4. PDFの出力内容（フォント名・見た目）は一切変わらないこと。既存のテストは無いので、修正後に `python3 -c "import card_builder"` がエラーなく通ることを確認すること。

## 修正2: `print-card/generator/requirements.txt` のバージョン固定

### 現状の問題
現在は以下のようにバージョン無指定:
```
Flask
pillow
reportlab
fonttools
qrcode[pil]
pikepdf
gunicorn
```
無指定だとRenderのビルド毎にPyPIから最新版解決が走り、ビルド時間が微増する上、将来的な破壊的アップグレードで予告なく壊れるリスクがある。

### 修正内容
現在ローカルの `print-card/.venv` で実際に動作確認できているバージョンに固定する:
```
Flask==3.1.3
pillow==12.3.0
reportlab==5.0.0
fonttools==4.63.0
qrcode[pil]==8.2
pikepdf==10.10.0
gunicorn==26.0.0
```

## 修正してはいけないもの
- `render.yaml`（`--worker-class gthread`等は既に対応済み、今回は触らない）
- `print-card/generator/wsgi.py`
- `print-card/generator/app.py`
- `print-card/build.py` / `print-card/generate_background.py`
- PDF/画像の見た目・レイアウト

## 成果物
1. `print-card/generator/card_builder.py` の該当箇所を修正（既存ファイル編集）
2. `print-card/generator/requirements.txt` をバージョン固定版に更新（既存ファイル編集）

両方とも既存ファイルの修正なので、差分（diff）を出力してください。Claude側でレビューの上、既存ファイルに反映します。
