# 名刺ジェネレーター 待機UI実装仕様書

## 背景・目的
名刺ジェネレーター（Renderの無料枠にデプロイ予定）には2種類の「待たされる」場面がある。それぞれに適したローディング表現を実装する。

1. **PDF生成中の待機**（`print-card/generator/`内、毎回発生。通常2〜3秒、Renderの無料枠だと数秒〜十数秒かかる可能性あり）
2. **Renderのコールドスタート待機**（15分以上アクセスが無いとスリープし、次のアクセスで復帰に30秒〜1分程度かかる。これはFlaskアプリ自体が眠っているため、アプリ内のJSでは対応できない。GitHub Pages側に常時アクセス可能な「起こし用ページ」を用意し、裏で寝ているRenderアプリを叩きながら「しばらくお待ちください」を表示、起きたら遷移させる）

## パート1: PDF生成中のローディングゲージ

### 対象ファイル（既存・編集）
- `print-card/generator/templates/index.html`
- `print-card/generator/static/generator.js`

### 現状の問題
`templates/index.html` の`<form action="/generate" method="post" enctype="multipart/form-data">`（249行目）はブラウザのネイティブフォーム送信。送信先`/generate`はPDFファイルを`send_file(..., as_attachment=True)`で返すダウンロードレスポンスのため、ページ遷移は起きないが、JS側は「いつダウンロードが完了したか」を検知できず、ボタンの見た目も送信中ずっと変化しない。

### 実装内容
フォーム送信をJSの`fetch`ベースに置き換える。

1. `templates/index.html`の`<button type="submit">CMYK PDFを生成</button>`（408行目）の付近に、ローディング表示用の要素を追加する。デザインは既存の和風テイスト（墨・木・金）に合わせる:
   - ボタン自体を「生成中…」表示に切り替える、またはボタン直下にインジケーター（プログレスバー風のゲージアニメーション、不確定進捗でよい＝実際の進捗%はサーバーから取得できないため）+ 「しばらくお待ちください」というテキストを表示するオーバーレイ/インラインエリアを追加
   - エラーメッセージ表示用の要素も、既存の`{% if error %}<p class="error">{{ error }}</p>{% endif %}`（Jinjaのサーバーサイド描画）に加えて、JS側で動的にエラーを差し込める`id`付き要素を用意する（fetchベースに変えるとバリデーションエラーもJS側で受け取ることになるため）

2. `generator.js`に以下のロジックを追加:
   - フォームの`submit`イベントをリッスンし、`event.preventDefault()`
   - 送信ボタンを`disabled`にし、ローディング表示（テキストを「生成中…」に変更、ゲージのCSSアニメーションを開始）
   - `new FormData(form)`でフォームデータを収集し、`fetch('/generate', { method: 'POST', body: formData })`を実行
   - レスポンスが`ok`でない場合: レスポンスボディ（HTML全文が返る想定。既存の`/generate`は400時にHTMLpage全体をre-renderして返すため、エラーメッセージ部分だけを正規表現かDOMParserで抽出するか、もしくはシンプルに「生成に失敗しました。写真・名前・Xアカウントを確認してください。」という汎用エラー文をJS側で表示する。バックエンド(`app.py`)は変更しない前提なので、後者（汎用エラー文）で十分）
   - レスポンスが`ok`の場合: `response.blob()`でPDFのBlobを取得 → `URL.createObjectURL(blob)` → 一時的な`<a>`要素を生成し`download`属性にファイル名を設定（`Content-Disposition`ヘッダーから取得するか、無理なら`meishi.pdf`等の固定名で可）してクリック → `URL.revokeObjectURL()`で後片付け
   - 成功・失敗いずれの場合も、最後にボタンを元の状態（`disabled`解除、テキストを「CMYK PDFを生成」に戻す）に戻し、ローディング表示を消す

3. ゲージアニメーションはCSSの`@keyframes`で実装する簡易な不確定プログレスバー（横に流れるアニメーション）でよい。既存のCSSカラー変数（墨・木・金のテーマ）を使うこと。既存の`<style>`ブロック内に追記する形で構わない。

### 変更してはいけないもの
- `print-card/generator/app.py`のルーティング・バリデーションロジック（`/generate`のレスポンス形式は変えない）
- `print-card/generator/card_builder.py`

## パート2: Renderコールドスタート起こし用ページ

### 新規ファイル
- リポジトリルート直下に `meishi-generator-open.html` を新規作成（Codex担当。新規ファイル作成はCodexの役割）

### 要件
- 既存サイトのデザインシステム（`style.css`の和風旅館テーマ：墨・木・金、CSS変数 `--ink-black`, `--charcoal`, `--wood-brown`, `--cedar`, `--gold-accent`, `--paper-white`, `--cream`）に合わせた単体の静的HTMLページ（`style.css`を読み込むか、同等のインラインスタイルで統一感を持たせる）
- ページを開いた瞬間に「しばらくお待ちください（起動準備中です）」という文言と、ロードゲージ（不確定プログレスバー、またはスピナー）アニメーションを表示する
- ページ内のJSで、以下の定数を宣言する（値は後でユーザーが実際のRender URLに書き換える前提。分かりやすいプレースホルダーにすること）:
  ```js
  const RENDER_APP_URL = "https://REPLACE_WITH_RENDER_URL.onrender.com/";
  ```
- 読み込み後、バックグラウンドで`RENDER_APP_URL`に対して`fetch(RENDER_APP_URL, { mode: "no-cors" })`を実行する。Renderがスリープしている場合は初回のfetchがタイムアウトするか、内部でリトライが必要になる可能性があるため、以下のポーリングロジックにする:
  - 一定間隔（例: 3秒ごと）で`fetch`を試行し続ける（`no-cors`モードなので中身は読めないが、`fetch`が例外を投げずに解決した時点で「サーバーが応答した」とみなしてよい）
  - 最大試行回数または最大待機時間（例: 90秒）を設けて、それを超えたら「起動に時間がかかっています。もう一度お試しいただくか、直接リンクからアクセスしてください」という文言とRENDER_APP_URLへの直接リンクを表示してポーリングを停止する
  - fetchが解決した時点で`window.location.href = RENDER_APP_URL`にリダイレクトする
- ページの見た目はスマホ・PC両方でレスポンシブに崩れないこと（プロジェクトのCLAUDE.mdのルール）

### 変更してはいけないもの
- 既存の`index.html`, `style.css`, `script.js`（メインサイト）は一切変更しない。今回は完全に独立した新規1ファイルとして作る

## 成果物
1. `print-card/generator/templates/index.html` の該当箇所の差分（既存ファイル、diffで出力してください。Claudeが適用します）
2. `print-card/generator/static/generator.js` の該当箇所の差分（既存ファイル、diffで出力してください。Claudeが適用します）
3. `meishi-generator-open.html`（新規ファイル、Codexが直接作成）
