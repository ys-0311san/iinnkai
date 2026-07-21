# 名刺ジェネレーターツール（ローカルWebフォーム→CMYK PDFダウンロード）

## 背景・目的

`print-card/` には現在、特定の1人（yuki__san）専用にハードコードされた名刺生成パイプライン
（`generate_background.py` / `build.py`）がある。これはこのまま**一切変更しない**
（すでにアクセア入稿用として確定・push済みのため、既存の出力が寸分でも変わってはならない）。

今回は、**メスケモ推進委員会の他のメンバーが自分の名刺を作れるように**、以下の4項目を
入力するとテンプレートに沿った表面画像を合成し、印刷用CMYK PDFをダウンロードできる
ローカル専用のWebフォームツールを新規に追加する。

- 写真（表面のフルブリード背景に使う一枚絵。ファイルアップロード）
- セリフ（キャッチコピー文言。自由入力の日本語テキスト）
- 名前（例: yuki__san 相当）
- Xアカウント（例: @shumiaka_yuki 相当。@の有無はどちらで入力されても正規化する）

このツールは**ユーザー個人のPCでローカル実行し、ブラウザでフォーム入力→生成→
その場でPDFをダウンロードして完結**すればよい。一般公開・常時ホスティングは不要。

裏面（丸ロゴ・「メスケモ推進委員会」バナー・`<LINK>`/X `@mesukemo_ya`/`<WEBSITE>`/QR）は
団体共通なので**個人ごとに変えない。既存の確定デザインをそのまま使い回す**。

## 絶対に守ること

- `print-card/generate_background.py` と `print-card/build.py` は**一切編集しない**
  （import して再利用するのは可。中身を書き換えるのは禁止）
- `print-card/` 以外のファイルには一切手を加えない
- 新規ツールは `print-card/generator/` ディレクトリ配下に新規ファイルとして追加する

## 新規ディレクトリ構成

```
print-card/generator/
├── app.py                 # Flaskアプリ本体
├── card_builder.py         # パラメータ化されたカード合成ロジック（表面のみ）
├── templates/
│   └── index.html          # 入力フォーム1ページ
└── README.md                # 起動方法（後述の「起動方法」節の内容を書く）
```

## 技術構成

- Flask を新規依存として `print-card/requirements.txt` に追記する（バージョン固定は
  他の依存に倣い緩めでよい）
- `card_builder.py` は `generate_background.py` から以下の**既存の関数・定数をimportして
  再利用する**（これらは特定の名刺に依存しない汎用ユーティリティなので変更不要のまま使える）:
  `mm`, `mirror_tile`, `color_grade_wood`, `draw_kumiko`, `foil_color`, `draw_gradient_rect`,
  `draw_frame`, `make_common_background`, `cover_image`, `add_bottom_scrim`,
  `save_rgb_and_cmyk`, `WIDTH`, `HEIGHT`, `PAGE_MM`, `LOGO`
- `build.py` からは `download_fonts`, `FONTS`, `mm_to_pt` 相当のロジック、
  CMYKカラー定義（offwhite等）を参考にしてよいが、**関数は書き換えず呼び出すかコピーする**
  （`build.py` の `write_cmyk_pdf_direct()` は表面・裏面両方を1つの関数でやっているため、
  そのまま使い回すのは難しい。表面と裏面を分離した新しい描画関数を `card_builder.py` に
  書き起こしてよい。裏面部分は既存の座標・フォントサイズ・色をそのまま数値コピーすること）
- フォント一式（`print-card/fonts/`）は既存の `download_fonts()` をimportして呼び出せば
  自動取得される。起動時に一度呼び出す

## `card_builder.py` の設計

### 表面の合成（新規パラメータ化ロジック）

```python
def build_custom_front(
    photo_path: Path,
    catchphrase: str,
    name: str,
    x_handle: str,
) -> Image.Image:
    ...
```

処理内容:
1. `photo_path` の画像を読み込み、**バナー自動クロップ検出は行わない**
   （既存の `find_banner_crop_y` は元の1枚専用のピンク帯検出ロジックなので使わない。
   汎用ツールでは写真をそのまま `cover_image()` でフルブリード配置する）
2. `cover_image(photo, (WIDTH, HEIGHT), x_bias=0.5, y_bias=0.3)` 相当で配置
   （x_bias/y_biasは人物写真の顔が安全エリアに収まりやすいよう適当な既定値でよい。
   厳密な数値はセルフチェックで実際に生成して確認し調整可）
3. `add_bottom_scrim()` を適用（既存関数そのまま）
4. **セリフ（キャッチコピー）をコードで縦書き風に重ねる。** 元の名刺（前回作業）では
   「手で解け、」「口で」「蕩ける。」のように数文字ごとに改行し、各行を右から左に
   縦一列に並べる伝統的な縦書きレイアウトだった。これを汎用化し、以下のロジックで
   自動的に行う関数 `draw_vertical_catchphrase(img, text)` を作る:
   - 入力テキストを「、」「。」を境目に自動で行分割する（区切り記号が無い場合は
     5〜6文字ごとに機械的に分割してよい）
   - 分割した行を右から左方向に並べる（1行目が一番右、以降左へ）
   - 各行は1文字ずつ上から下へ配置する（PILで1文字ずつ`draw.text`する縦書き実装でよい。
     日本語フォントの縦書き専用グリフ回転等の高度な処理は不要、単純に文字を上から
     順に並べるだけでよい）
   - フォントは `NotoSerifJP-Bold.ttf`（fontsディレクトリから読み込み、無ければ
     `download_fonts()` を呼んで取得）
   - スタイル: 白文字＋黒の縁取り（ストローク）。文字サイズ・行間・配置位置
     （画像左側、安全エリア内）は実際に生成して見た目を確認しながら調整してよい
   - 安全エリア（`mm(6.0)` 内側）からはみ出さないこと
5. 丸ロゴ（`LOGO`定数）を左下に14mm・不透明度75%で合成する
   （既存の確定名刺の `generate_background.py` の `build_front_from_photo()` と
   全く同じロジック・数値を踏襲する。コピーしてよい）
6. シャドウリフト（ガンマ1.12）も同様に踏襲する
7. フチ（`draw_frame`）は付けない（既存の確定デザインを踏襲）
8. 右下に名前＋Xハンドルを描く。これは画像合成ではなく、PDF生成時にReportLabの
   テキストとして重ねる（既存の確定名刺の `build.py` の `yuki__san` / `@shumiaka_yuki`
   描画ロジック・座標・フォント・二重シャドウ手法をそのまま数値コピーする）

### 裏面

- 既存の確定済み `card-bg-back-cmyk.jpg` 等のアセットをそのまま使い回す
  （`print-card/assets/` に生成済みのものが既にある。無ければ
  `generate_background.py` の `build_backgrounds()` を一度呼んで生成させる）
- 裏面のテキスト・QR描画は `build.py` の `write_cmyk_pdf_direct()` の裏面部分と
  完全に同じ座標・フォント・文言を再現する（コピーでよい）

### CMYK PDF生成

- ReportLabで2ページ（表面＝カスタム、裏面＝固定）のCMYK直描画PDFを生成する関数
  `generate_pdf(photo_path, catchphrase, name, x_handle, output_path)` を作る
- ページサイズ・安全マージン等の定数値は `build.py` の `PAGE_MM` 等と同じ値を使う
  （importして使うか、同じ値を定義し直してよい）

## `app.py`（Flask）の設計

- ルート `GET /`: `templates/index.html` を表示（写真アップロード・セリフ・名前・
  Xアカウントの4つの入力欄を持つ1画面のシンプルなフォーム。装飾は最小限でよい）
- ルート `POST /generate`:
  - アップロードされた画像を一時ディレクトリに保存
  - Xアカウントの先頭に`@`が無ければ補う
  - `card_builder.generate_pdf(...)` を呼び出しCMYK PDFを一時ファイルとして生成
  - `send_file(..., as_attachment=True, download_name=f"meishi_{name}_cmyk.pdf")` で
    そのままダウンロードさせる
  - 生成後、一時ファイル・一時画像は処理完了後に削除する
- 最低限のバリデーション: 画像ファイルが選択されているか、名前・Xアカウント・
  セリフが空でないか。空の場合はフォームにエラーメッセージを表示して再表示する
- ポートは`5000`番などデフォルトでよい。`app.run(debug=False)` とし、
  `if __name__ == "__main__":` で起動する

## 起動方法（README.mdに書く内容）

```sh
cd print-card
python3 -m venv .venv   # 既存の.venvがあれば流用可
. .venv/bin/activate
pip install -r requirements.txt
python generator/app.py
```

起動後、ブラウザで `http://localhost:5000/` を開いてフォームに入力し、
送信すると名刺のCMYK PDFがそのままダウンロードされる。

## セルフチェック

- `python generator/app.py` が起動し、`http://localhost:5000/` にアクセスすると
  フォームが表示されること
- テスト用に適当な人物写真・セリフ・名前・Xアカウントを入力して送信し、
  2ページ・61mm×97mmのCMYK PDFがダウンロードされること
- 生成されたPDFの1ページ目（表面）に、アップロードした写真がフルブリードで
  敷かれ、入力したセリフが縦書き風に、名前とXアカウントが右下に、
  丸ロゴが左下に配置されていること
- 2ページ目（裏面）が既存の確定デザイン（丸ロゴ・バナー・LINK/X/WEBSITE/QR）と
  完全に一致していること
- 生成されたCMYK PDF内の画像が `/DeviceCMYK` であること
- **`print-card/generate_background.py` と `print-card/build.py` が今回のコミットで
  一切変更されていないこと**（`git diff --stat` で確認する）
- 既存の `python build.py`（確定済みyuki__san名刺）を実行しても、これまでと
  同じ出力になること（リグレッションが無いこと）

## 出力

- `print-card/generator/app.py`
- `print-card/generator/card_builder.py`
- `print-card/generator/templates/index.html`
- `print-card/generator/README.md`
- `print-card/requirements.txt` に Flask を追記
