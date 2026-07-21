# 名刺ジェネレーター 第3段: セリフの縦書き/横書き切り替え・回転・サイズ調整

## 背景

`print-card/generator/` は現在、写真・セリフ・名前・Xアカウントを入力してCMYK印刷用PDFを
生成するFlaskツール（写真のドラッグ移動・ズームスライダー・ロゴON/OFFまで実装済み）。

今回は「セリフ」（キャッチコピー文言）に対して、以下5つの調整機能を追加する。

1. **縦書き/横書きの切り替え**
2. **回転**
3. **サイズ調整**（ズームスライダーと同じ操作感のスライダーをもう1本追加）
4. **縁取り（黒枠）の太さ調整**
5. **文字自体の色を白/黒で切り替え**

対象は `print-card/generator/` 配下のみ。`print-card/generate_background.py` /
`print-card/build.py` は今回も一切変更しない。名前・Xアカウント・写真・丸ロゴの
既存の挙動（ドラッグ移動・ズーム・ON/OFF）は変更しない。

## 現状のコード構成（変更対象）

- `print-card/generator/static/generator.js`: canvasプレビュー描画・ドラッグ・
  ズームスライダー・ロゴトグルの実装済みJS
- `print-card/generator/templates/index.html`: フォーム・canvas・スライダー類
- `print-card/generator/card_builder.py`: サーバー側でCMYK PDFを直接描画する
  Pythonロジック。`draw_vertical_catchphrase()` が現在のセリフ描画関数
- `print-card/generator/app.py`: Flaskルート。hidden inputをパースして
  `card_builder.generate_pdf()` に渡している

現状のセリフ描画は「縦書き固定」。`_catchphrase_lines()` で「、」「。」区切りで
行分割し、各行を右から左へ列として並べ、各列の中で1文字ずつ上から下へ描画している
（フォントは `NotoSerifJP-Bold`、白文字＋黒縁取り）。

## 追加するUI（`templates/index.html`）

プレビューパネル内、既存の「寄り引き」スライダー・「左下ロゴを表示」チェックボックスの
近くに以下を追加する。

- **書字方向切り替え**: ラジオボタンまたはトグル2択「縦書き」「横書き」
  （デフォルトは現状維持の「縦書き」）
- **回転スライダー**: `<input type="range" min="-45" max="45" value="0" step="1">`
  （単位は度。0が現状通りの回転なし）
- **サイズスライダー**: 寄り引きスライダーと同じ見た目・操作感で
  `<input type="range" min="60" max="180" value="100" step="1">`
  （100%が現状の自動計算サイズ。60%〜180%の範囲で拡大縮小する倍率）
- **縁取り（黒枠）太さスライダー**: `<input type="range" min="0" max="200" value="100" step="1">`
  （100%が現状の縁取り太さ。0%で縁取りなし、200%で現状の2倍の太さ）
- **文字色切り替え**: ラジオボタンまたはトグル2択「白」「黒」
  （デフォルトは現状維持の「白」）

対応するhidden inputも追加する:
`catchphrase_orientation`（"vertical" または "horizontal"）、
`catchphrase_rotation_deg`、`catchphrase_size_factor`（1.0が等倍）、
`catchphrase_stroke_factor`（1.0が等倍、0.0で縁取りなし）、
`catchphrase_fill_color`（"white" または "black"）。

### 文字色と縁取り色の組み合わせ（重要）

文字色を「黒」にした場合、縁取り色は自動的に「白」に反転させること
（逆に文字色が「白」のときは縁取りは従来通り黒）。理由: 暗い写真の上に
黒文字＋黒縁取りを乗せると、暗部で文字が完全に見えなくなるため。
ユーザーが縁取り色を個別に選ぶUIは不要（文字色と連動する自動反転のみでよい）。
縁取り太さスライダーで0%にした場合は縁取り自体を描画しない
（この場合は文字色と背景のコントラストのみに依存する）。

## 座標系の変更（最重要）

現状の `state.catchphraseX` / `state.catchphraseY`（JS側）と
`catchphrase_pos_mm`（Python側）は「テキストブロックの左上寄りの基準点」を指している。
**回転を導入するため、これを「テキストブロックの中心点（回転軸）」に統一する。**
JS・Python両方で以下の座標変換ロジックに揃えること。

### 横書きレイアウト（新規）

- 「、」「。」区切りで行分割するロジック（`_catchphrase_lines` /
  `splitCatchphrase`）はそのまま流用する
- 各行を通常の横書き（左から右）で描画し、行を上から下へ積む
  （1行目が一番上）。各行は中央揃えでよい
- フォントサイズは「最も長い行の描画幅」と「行数×行送り」が、安全エリア相当の
  最大幅・最大高さに収まるように自動計算する（縦書きモードの自動計算と同様の
  考え方でよい。具体的な収まり判定の係数は縦書き実装を参考に妥当な値を選んでよい）
- スタイルは縦書きと同じ（`NotoSerifJP`太字、文字色・縁取りは下記の
  「文字色と縁取り色の組み合わせ」「縁取り太さ」設定に従う）

### サイズ調整

- 自動計算されたフォントサイズに対し、`catchphrase_size_factor`
  （スライダー値/100）を掛け合わせる。60%〜180%の範囲
- サイズ変更時、テキストブロックの**中心位置は変えず**その場で拡大縮小する
  （ズームスライダーと同様、中心固定でスケールする挙動）

### 回転

- テキストブロック（縦書き・横書きどちらのモードでも、行分割後に確定する
  幅wmm・高さhmmの矩形）を、その中心を軸に `catchphrase_rotation_deg` 度
  回転させて描画する
- JS（canvas）: `ctx.translate(centerX, centerY)` → `ctx.rotate(angleRad)` →
  ローカル座標（原点=矩形の中心）でテキストを描画 → `ctx.restore()`
- Python（Pillow）: テキストブロックを一旦透過PNG（`Image.new("RGBA", (w, h))`）
  に通常通り描画し、`.rotate(angle, expand=True, resample=Image.BICUBIC)` で
  回転させてから、回転後の画像の中心が元のブロック中心と一致するように
  `alpha_composite` で合成する（Pillowの `rotate(expand=True)` は画像サイズが
  変わるので、貼り付け位置は「中心を合わせる」形で計算すること）

## 5mm安全マージンのクランプ（回転後のAABBで判定すること）

**これが今回のタスクで最も重要な正確性要件。** 現状の `textClamp()` /
`_clamp_text_box_mm()` は「回転していない矩形の幅・高さ」でクランプしているが、
回転後は矩形の実際の占有範囲（軸並行境界ボックス, AABB）が変わるため、
**回転を考慮したAABBの半幅・半高さを使って中心位置をクランプする**必要がある。

回転角 `theta`（ラジアン）、矩形の幅 `w`、高さ `h` に対して、回転後のAABBの
半幅・半高さは以下の式で求まる（矩形の4隅を回転させた場合の外接矩形と等価）:

```
halfW = (w / 2) * |cos(theta)| + (h / 2) * |sin(theta)|
halfH = (w / 2) * |sin(theta)| + (h / 2) * |cos(theta)|
```

中心座標 `(cx, cy)`（mm、ページ左上原点）のクランプ範囲は:

```
cx ∈ [ 5 + halfW , 61 - 5 - halfW ]
cy ∈ [ 5 + halfH , 97 - 5 - halfH ]
```

（`5` はmm単位の安全マージン。範囲の下限が上限を超える場合＝矩形が大きすぎて
5mm安全エリア内に収まらない場合は、中心をページ中央に固定してよい）

- JS側: ドラッグ移動時・回転スライダー変更時・サイズスライダー変更時、
  いずれのタイミングでもこのクランプを再計算して中心座標を補正すること
- Python側 (`card_builder.py`): クライアントから送られてきた
  `catchphrase_pos_mm`（中心座標）・`catchphrase_rotation_deg`・
  `catchphrase_size_factor` を受け取った際、**サーバー側でも同じ計算式で
  再クランプしてから描画すること**（クライアント側の制約を信用せず、
  直接POSTされた不正な値にも対応する。これは前回までの実装方針と同じ）
- 回転角の入力値自体も念のため -45〜45度の範囲外ならクランプする

## ドラッグの当たり判定（回転を考慮する）

キャンバス上でセリフブロックをドラッグで掴む判定 (`pickTarget` / `contains`) は、
回転している状態でも正しく判定できるようにする。クリック/タップ座標を、
テキストブロックの中心を軸に **逆回転** させてローカル座標に変換してから、
幅w・高さhの矩形内に収まっているかで判定すること
（回転していない状態、つまり `catchphrase_rotation_deg = 0` のときは
従来通りの単純な矩形判定と一致する必要がある）。

## `app.py` / `card_builder.py` への受け渡し

- `app.py`: 新規hiddenフィールド `catchphrase_orientation`（文字列）、
  `catchphrase_rotation_deg`（float、パース失敗時は0）、
  `catchphrase_size_factor`（float、パース失敗時は1.0）、
  `catchphrase_stroke_factor`（float、パース失敗時は1.0）、
  `catchphrase_fill_color`（文字列、"white"/"black"以外なら"white"）を読み取り、
  `generate_pdf()` に渡す
- `card_builder.py`: `draw_vertical_catchphrase()` を拡張するか、
  新しい統合関数（例: `draw_catchphrase()`）に置き換えて、
  orientation・rotation・size_factor・stroke_factor・fill_colorを
  受け取れるようにする。fill_colorが"black"の場合は縁取り色を白に、
  "white"の場合は縁取り色を黒にする（上記の自動反転ルール）。
  vertical/horizontalどちらのモードでも、上記の中心座標・回転AABBクランプの
  ロジックを共通化すること（vertical用とhorizontal用でクランプ計算が
  重複しないよう、共通関数に切り出すことを推奨する）

## 追加機能: カスタムフォントのアップロード

写真と同様に、フォントファイル（.ttf/.otf）をアップロードできるようにし、
アップロードされた場合は**セリフと名前＋Xアカウント表記の両方**（表面のみ、
裏面の団体ロゴ・`<LINK>`等は対象外）にそのフォントを使う。アップロードが
無い場合は現状通り `NotoSerifJP-Bold` を使う（デフォルト動作は変更しない）。

### UI

- フォーム（`.fields`内）に `写真` と同様の任意項目として
  `<input type="file" name="font" accept=".ttf,.otf">` を追加する
  （ラベルは「フォント（任意）」のように分かりやすくする）

### クライアント側プレビュー（`generator.js`）

- フォントファイルが選択されたら `FontFace` API
  （`new FontFace('CustomCardFont', arrayBuffer)` → `.load()` →
  `document.fonts.add(...)`）でブラウザに読み込み、以後
  `drawCatchphrase()` / `drawSignature()` の `ctx.font` に
  `"CustomCardFont"` を使うようにする（読み込みが完了するまでは
  現状の `"Noto Serif JP"` フォールバックのままでよい）
- ファイルが選択されていない場合は現状通り

### サーバー側（`card_builder.py` / `app.py`）

- `app.py`: `request.files.get("font")` を受け取り、選択されていれば
  一時ディレクトリに保存して `generate_pdf()` に渡す。拡張子は
  `.ttf`/`.otf` のみ許可し、それ以外は無視して既定フォントにフォールバックする
- `card_builder.py`: フォントパスが渡された場合、ReportLabに
  **既存の `"NotoSerifJP"` とは別名**（例: `"CustomCardFont"`）で
  `pdfmetrics.registerFont(TTFont("CustomCardFont", str(font_path)))`
  として登録し、セリフ・名前・Xアカウント表記の描画フォントとして使う。
  PIL側（セリフの画像合成）も同様に `ImageFont.truetype(str(font_path), size)`
  で読み込んで使う
- **裏面の描画（`_draw_back`）や、既存の `build.py`/`generate_background.py`
  経由の確定名刺生成には一切影響させないこと**（フォント登録名を別にすることで
  衝突を避ける）
- アップロードされたフォントファイルが不正（読み込みエラー）の場合は、
  エラーを出さずデフォルトフォント（NotoSerifJP-Bold）にフォールバックすること

## セルフチェック

- `http://localhost:5000/` を開き、セリフを入力した状態で「横書き」に
  切り替えると、プレビューが横書き（上から行が積まれる形）になること
- 回転スライダーを動かすと、セリフブロックがその場（中心固定）で回転すること
- サイズスライダーを動かすと、セリフブロックが中心固定で拡大縮小すること
- 縁取り太さスライダーを0%にすると縁取りが消え、200%にすると太い縁取りになること
- 文字色を「黒」に切り替えると、文字が黒・縁取りが白に自動反転すること
  （逆に「白」に戻すと文字が白・縁取りが黒に戻ること）
- 回転させた状態でセリフブロックをドラッグして端に寄せると、
  **回転後の見た目上の占有範囲**がページ端から5mm以内に入り込む前に
  ドラッグが止まること（回転前の矩形サイズだけで判定していないか、
  実際に45度回転させた状態で四隅までドラッグして目視確認すること）
- 送信すると、プレビュー通りの書字方向・回転・サイズでCMYK PDFが
  生成されること
- curlなどで直接 `catchphrase_rotation_deg=45&catchphrase_size_factor=1.8`等の
  極端な値と、5mm境界を超えるような `catchphrase_x_mm`/`catchphrase_y_mm` を
  POSTしても、サーバー側で5mm安全マージン内にクランプされて出力されること
  （テキストがページ端からはみ出さないこと）
- 回転角0・横書き無効（縦書きのまま）・サイズ100%の場合、既存の見た目と
  完全に一致すること（リグレッションがないこと）
- 既存の `python build.py`（確定済みyuki__san名刺）に影響がないこと
- `print-card/generate_background.py` / `print-card/build.py` が無変更であること

## 出力

- `print-card/generator/templates/index.html`
- `print-card/generator/static/generator.js`
- `print-card/generator/card_builder.py`
- `print-card/generator/app.py`
