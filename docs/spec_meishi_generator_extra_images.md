# 名刺ジェネレーター（print-card/generator/）— 追加画像スロット×3

対象ディレクトリ: `print-card/generator/`
[[spec_meishi_generator_photo_rotate_brightness.md]] で実装した背景写真の回転・明度調整には触れない。既存の写真/セリフ/名前・X ID/ロゴの機能・レイアウトも変更しない。

対象ファイル:
- `print-card/generator/static/generator.js`
- `print-card/generator/templates/index.html`
- `print-card/generator/app.py`
- `print-card/generator/card_builder.py`

---

## 要件

- 名刺の背景写真とは別に、**任意の装飾画像（ステッカー的な画像）を最大3枚**、自由に追加できるようにする
- 初期状態は3枚とも「空」（未アップロード）。空のスロットはPDF生成時に無視する
- 各スロットは独立して: **アップロード / ドラッグでの位置移動 / サイズ（拡大縮小） / 回転**ができる
- 回転範囲は**自由（-180°〜180°）**でよい（背景写真と違い、名刺全面を覆う要件がないので「回転で角が透明になる」問題は起きない。単に画像自体を回転させるだけ）
- **名刺の断ち落とし部分（端5mm の安全マージン）に、はみ出して配置してもよい**。テキスト（セリフ・名前）のような安全マージンのクランプは適用しない
- 編集中のプレビューには目安として安全マージンの点線枠（既存の `drawSafetyGuide()`）が出ているので、追加画像もそれを参考にできればよい。**この点線枠はプレビュー専用であり、既にPDF生成には一切含まれていない**（`drawSafetyGuide()` は `drawPreview()` の中でのみ呼ばれ、`card_builder.py` 側には対応する描画が存在しない）ので、この点は現状の仕組みをそのまま踏襲すればよく、追加の実装は不要

---

## 1. `generator.js`

### 1-a. 定数・state

```js
const EXTRA_IMAGE_COUNT = 3;
const EXTRA_BASE_MM = 22.0; // scale=100%のときの「収まる正方形」の一辺(mm)。アスペクト比は保持(contain)
const EXTRA_DEFAULT_POS_MM = [
  { x: 14, y: 14 },
  { x: 47, y: 14 },
  { x: 30.5, y: 88 },
];
```

- `state.extraImages` を追加: `EXTRA_IMAGE_COUNT` 個の配列、各要素は
  `{ image: null, xMm: EXTRA_DEFAULT_POS_MM[i].x, yMm: EXTRA_DEFAULT_POS_MM[i].y, scalePercent: 100, rotationDeg: 0, moved: false }`
- `state.bounds` に `extraImages: [null, null, null]` を追加（既存の `state.bounds.name` / `state.bounds.catchphrase` と同じ役割）

### 1-b. 描画

`drawScrim()` の後、`drawCatchphrase()` の前に呼ぶ（背景の上・主要テキストの下のレイヤーとして描画する）:

```js
function drawExtraImages() {
  state.extraImages.forEach((slot, i) => {
    state.bounds.extraImages[i] = null;
    if (!slot.image) return;
    const containPx = mmToPx(EXTRA_BASE_MM * slot.scalePercent / 100);
    const ratio = Math.min(containPx / slot.image.width, containPx / slot.image.height);
    const w = slot.image.width * ratio;
    const h = slot.image.height * ratio;
    const cx = mmToPx(slot.xMm);
    const cy = mmToPx(slot.yMm);
    state.bounds.extraImages[i] = { cx, cy, w, h, rotationDeg: slot.rotationDeg };

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(slot.rotationDeg * Math.PI / 180);
    ctx.drawImage(slot.image, -w / 2, -h / 2, w, h);
    ctx.restore();
  });
}
```

`drawPreview()` の呼び出し順を `drawBackground(); drawScrim(); drawExtraImages(); drawCatchphrase(); drawLogo(); drawSignature(); drawSafetyGuide();` に変更する（`drawSafetyGuide()` が最後＝最前面のままであること）。

### 1-c. ドラッグ操作

- `contains(bounds, point)` は既存の実装をそのまま使う（`bounds.cx` があるケースの回転対応判定を再利用。**追加画像には安全マージンクランプが無いので、この関数自体は変更不要**）
- `pickTarget(point)` を、視覚的に手前にあるものから順に判定するよう拡張する（`name` → `catchphrase` → 追加画像を配列の**後ろ(=上のレイヤー)から順に** → 最後に `photo` にフォールバック）:

```js
function pickTarget(point) {
  if (contains(state.bounds.name, point)) return 'name';
  if (contains(state.bounds.catchphrase, point)) return 'catchphrase';
  for (let i = state.bounds.extraImages.length - 1; i >= 0; i--) {
    if (contains(state.bounds.extraImages[i], point)) return `extra${i}`;
  }
  if (contains({ x: 0, y: 0, w: CANVAS_W, h: CANVAS_H }, point)) return 'photo';
  return null;
}
```

- `beginDrag()` の `state.drag` に、対象が `extra${i}` のときの開始位置 `extraXMm/extraYMm`（`state.extraImages[i].xMm/yMm` の値）を積む。`state.drag.target.startsWith('extra')` で判定して `i = Number(state.drag.target.slice(5))` のように添字を取り出す実装でよい
- `moveDrag()` に `extra${i}` 用の分岐を追加。**クランプは一切かけない**（テキストのような `textClamp`/`centerClamp` を通さず、`state.extraImages[i].xMm = state.drag.startXMm + dxMm` のようにそのまま加算するだけでよい）。ドラッグ後は `slot.moved = true` を立てる
- `endDrag()` は既存のまま（`updateHiddenInputs()` 呼び出しは既存の仕組みに乗る）

### 1-d. アップロード・スライダー・削除

各スロット `i`（0,1,2）ごとに以下のイベントを設定する:

```js
function loadExtraImage(i, file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      state.extraImages[i].image = image;
      drawPreview();
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function clearExtraImage(i) {
  state.extraImages[i] = {
    image: null,
    xMm: EXTRA_DEFAULT_POS_MM[i].x,
    yMm: EXTRA_DEFAULT_POS_MM[i].y,
    scalePercent: 100,
    rotationDeg: 0,
    moved: false,
  };
  // 対応するファイル入力・hidden inputもリセットすること
  drawPreview();
}
```

- スケールスライダー `extra${i}ScaleSlider`（min=30, max=250, step=1, value=100）: `input` イベントで `state.extraImages[i].scalePercent = Number(value)` → `drawPreview()`
- 回転スライダー `extra${i}RotationSlider`（min=-180, max=180, step=1, value=0）: `input` イベントで `state.extraImages[i].rotationDeg = Number(value)` → `drawPreview()`
- 削除ボタン `extra${i}ClearBtn`: クリックで `clearExtraImage(i)` を呼び、対応する `<input type="file">` の `value = ''` にリセットする

### 1-e. hidden input（サーバー送信用）

`updateHiddenInputs()` に、3スロット分をループで追加する:

```js
state.extraImages.forEach((slot, i) => {
  const idx = i + 1;
  document.getElementById(`extra${idx}XInput`).value = slot.xMm.toFixed(3);
  document.getElementById(`extra${idx}YInput`).value = slot.yMm.toFixed(3);
  document.getElementById(`extra${idx}ScaleInput`).value = slot.scalePercent.toFixed(1);
  document.getElementById(`extra${idx}RotationInput`).value = slot.rotationDeg.toFixed(3);
});
```

（`inputs` オブジェクトにこれらの参照をキャッシュしてから使う形でも、都度 `getElementById` する形でも既存コードの流儀に合わせてよい）

---

## 2. `templates/index.html`

`<!-- 追加画像 -->` セクションを、既存の「フォント」入力の下あたりに新設する（3スロット分をループ的に3ブロック並べる。Jinja2の `{% for %}` は使わず、静的に3つ書けばよい—Flask側は素朴なform POSTのため）:

```html
<fieldset class="extra-images-fieldset">
  <legend>追加画像（最大3枚・任意）</legend>

  <div class="extra-image-block">
    <label>追加画像1<input type="file" id="extra1Input" name="extra1_image" accept="image/*"></label>
    <label class="catchphrase-control">サイズ<input type="range" id="extra1ScaleSlider" min="30" max="250" value="100" step="1"></label>
    <label class="catchphrase-control">回転<input type="range" id="extra1RotationSlider" min="-180" max="180" value="0" step="1"></label>
    <button type="button" id="extra1ClearBtn">この画像を削除</button>
    <input type="hidden" id="extra1XInput" name="extra1_x_mm">
    <input type="hidden" id="extra1YInput" name="extra1_y_mm">
    <input type="hidden" id="extra1ScaleInput" name="extra1_scale">
    <input type="hidden" id="extra1RotationInput" name="extra1_rotation_deg">
  </div>

  <!-- extra2, extra3 も同様の構造で番号だけ変えて複製 -->
</fieldset>
```

- `<style>` に `.extra-images-fieldset` / `.extra-image-block`（`border-top: 1px solid #e2d6c4; padding-top: 12px; display: grid; gap: 8px;` 程度の簡易な区切り）を追加する。既存の `.zoom-control` / `.catchphrase-control` のgridスタイルはそのまま流用してよい
- `<p>写真・名前・セリフはプレビュー上でドラッグできます...</p>` の説明文に「追加画像も同様にドラッグできます」を一言足す

---

## 3. `app.py`

`generate()` 内で、3スロット分をループ処理して一時ファイルに保存し、`generate_pdf()` に渡す新引数 `extra_images: list[dict]` を組み立てる:

```python
def _parse_extra_images(temp_dir: Path) -> list[dict | None]:
    extras: list[dict | None] = []
    for i in range(1, 4):
        file = request.files.get(f"extra{i}_image")
        if file is None or file.filename == "":
            extras.append(None)
            continue
        suffix = Path(secure_filename(file.filename)).suffix or ".png"
        path = temp_dir / f"extra{i}{suffix}"
        file.save(path)
        extras.append({
            "path": path,
            "x_mm": _parse_float(f"extra{i}_x_mm", 30.5),
            "y_mm": _parse_float(f"extra{i}_y_mm", 48.5),
            "scale_factor": _clamp(_parse_float(f"extra{i}_scale", 100.0), 30.0, 250.0) / 100.0,
            "rotation_deg": _clamp(_parse_float(f"extra{i}_rotation_deg", 0.0), -180.0, 180.0),
        })
    return extras
```

- `generate()` の中で `temp_dir` 作成後にこれを呼び、`extra_images = _parse_extra_images(temp_dir)`
- `generate_pdf(..., extra_images=extra_images)` を呼び出しに追加
- `try/except` のクリーンアップ処理（例外時に一時ファイルを消す部分）に、`extra_images` の各 `path` も含めて `unlink(missing_ok=True)` すること（既存の `photo_path`/`font_path`/`output_path` のクリーンアップと同じ扱いにする）
- 成功時のクリーンアップ（`cleanup()` 関数）にも同様に追加すること

---

## 4. `card_builder.py`

```python
EXTRA_BASE_MM = 22.0  # generator.js の EXTRA_BASE_MM と必ず同じ値にする


def _draw_extra_images(front: Image.Image, extra_images: list[dict | None]) -> None:
    for extra in extra_images:
        if extra is None:
            continue
        img = Image.open(extra["path"]).convert("RGBA")
        contain_px = mm(EXTRA_BASE_MM * extra["scale_factor"])
        ratio = min(contain_px / img.width, contain_px / img.height)
        w = max(1, round(img.width * ratio))
        h = max(1, round(img.height * ratio))
        resized = img.resize((w, h), Image.Resampling.LANCZOS)
        # generator.js の ctx.rotate(rotationDeg) と向きを合わせるため、
        # draw_catchphrase() と同様に符号を反転する（PILのrotate()はcanvasと回転方向が逆）
        rotated = resized.rotate(-extra["rotation_deg"], expand=True, resample=Image.Resampling.BICUBIC)
        cx = mm(extra["x_mm"])
        cy = mm(extra["y_mm"])
        paste_x = round(cx - rotated.width / 2)
        paste_y = round(cy - rotated.height / 2)
        front.alpha_composite(rotated, (paste_x, paste_y))
```

呼び出し位置は `build_custom_front()` 内、`add_bottom_scrim(front)` の直後・`draw_catchphrase(...)` の直前（`generator.js` の描画順と合わせる）:

```python
front = _cover_image_with_offset(...).convert("RGBA")
add_bottom_scrim(front)
_draw_extra_images(front, extra_images)
draw_catchphrase(front, ...)
```

- `build_custom_front()` と `generate_pdf()` の両方に `extra_images: list[dict] | None = None` 引数を追加し、`generate_pdf()` → `build_custom_front()` へそのまま受け渡す（`None` の場合は空リスト扱いにする）
- **安全マージンのクランプ関数（`_clamp_text_center_mm` 等）は一切使わない**こと（要件通り、断ち落とし部分にはみ出してよい）
- `app.py` 側で座標・スケール・回転はすでに範囲チェック済みだが、念のため `card_builder.py` 側でも `scale_factor` を `0.3〜2.5`、`rotation_deg` を `-180〜180` にクランプしておく（他の値と同様、サーバー側の二重防御として）

---

## 5. おまけ: セリフを空でも生成できるようにする

現状、セリフ（`catchphrase`）は必須項目になっているが、これを**任意項目**に変更する。

- `templates/index.html`: `<textarea id="catchphraseInput" name="catchphrase" required>` の `required` 属性を削除する
- `app.py`: `generate()` 内の以下のバリデーションブロックを削除する（セリフが空でもエラーにしない）
  ```python
  if not catchphrase:
      return render_template("index.html", error="セリフを入力してください。", values=values), 400
  ```
- 描画側（`generator.js` の `catchphraseMetrics()`/`drawCatchphrase()`、`card_builder.py` の `_catchphrase_metrics()`/`draw_catchphrase()`）は、空文字列に対して**既に**「何も描画せずreturnする」実装になっている（`_catchphrase_lines("")` が `[]` を返し、`if not lines: return` で早期returnする）ため、これらのロジックは変更不要。動作確認として、セリフを空のまま送信してもエラーにならず、セリフ無しのPDFが正しく生成されることを確認すること

---

## 6. 動作確認の観点

1. 3スロットとも空のまま送信 → 既存の出力から見た目が変わらないこと（回帰確認）
2. 1枚だけ透過PNGをアップロード → プレビューでドラッグ・拡大縮小・回転ができること、透明部分が黒くならないこと
3. 画像を安全マージンの点線枠の外（端5mm）や、キャンバスの端ギリギリまでドラッグ → クランプされずに動かせること
4. 3枚すべてアップロードして重ねる → 後からアップロードしたスロットが上のレイヤーになること（z順）、クリック時に一番上の画像が優先してつかめること
5. 「この画像を削除」ボタンで該当スロットが空に戻り、position/scale/rotationもデフォルトに戻ること
6. フォーム送信 → PDF上でも、プレビューと回転方向・位置・サイズが一致していること（回転方向の符号が逆になっていないか特に確認）
7. `catchphrase_rotation_deg` 等、既存のセリフ・名前関連の項目に影響が出ていないこと
