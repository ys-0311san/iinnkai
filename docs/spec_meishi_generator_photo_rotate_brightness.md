# 名刺ジェネレーター（print-card/generator/）— 背景写真の回転・明度調整

対象ディレクトリ: `print-card/generator/`
既存機能（写真アップロード・寄り引きズーム・セリフ回転/サイズ/縁取り/文字色・ロゴON/OFF・ドラッグ位置調整）には触れず、**背景写真専用の「回転」「明度調整」を追加**する。

対象ファイル:
- `print-card/generator/static/generator.js`（プレビューcanvas側）
- `print-card/generator/templates/index.html`（フォームUI・hidden input）
- `print-card/generator/app.py`（フォーム受け取り）
- `print-card/generator/card_builder.py`（CMYK PDF生成側。`_cover_image_with_offset` / `build_custom_front`）

---

## 1. 背景写真の回転（-15°〜15°）

### 要件
- 回転範囲は **-15°〜15°**（小さめの傾き演出。全面カバーのため大角度は角が透明になるリスクが高く採用しない）
- 名刺全面（cover方式）を覆う写真なので、回転させても四隅に透明/黒帯が出てはならない
- 既存の「寄り引き（ズーム）スライダー」（100〜250%）とドラッグ位置調整はそのまま活かす。回転はこれらの上に重ねて安全に動作させる

### 数学的な考え方（JS/Pythonで共通のロジック）

キャンバス（または印刷ページ）のサイズを `CW × CH` とする。回転角 `θ`（ラジアン）に対して、**回転させても CW×CH を完全に覆うために最低限必要な軸並行サイズ**は次の式で求まる（テキストの安全マージン計算で使っている `rotatedHalfSizeMm` / `_rotated_aabb_half_mm` と同じ考え方）。

```
requiredW = CW * |cos θ| + CH * |sin θ|
requiredH = CW * |sin θ| + CH * |cos θ|
```

この `requiredW × requiredH` を「写真が最低限カバーすべきサイズ」として扱うことで、既存のcover計算・パン（ドラッグ）クランプをそのまま一般化できる。

#### 1-a. `generator.js`（プレビュー側）

- `state` に `photoRotationDeg`（初期値 `0`）を追加
- `CANVAS_W`, `CANVAS_H`（= 610, 970）を使い、以下のヘルパーを追加:

```js
function requiredCoverSize(rotationDeg) {
  const theta = rotationDeg * Math.PI / 180;
  return {
    w: CANVAS_W * Math.abs(Math.cos(theta)) + CANVAS_H * Math.abs(Math.sin(theta)),
    h: CANVAS_W * Math.abs(Math.sin(theta)) + CANVAS_H * Math.abs(Math.cos(theta)),
  };
}
```

- `resetPhotoPosition()` 内の `state.baseScale = Math.max(CANVAS_W / state.photo.width, CANVAS_H / state.photo.height)` を、`requiredCoverSize(state.photoRotationDeg)` を使う形に置き換える:

```js
const req = requiredCoverSize(state.photoRotationDeg);
state.baseScale = Math.max(req.w / state.photo.width, req.h / state.photo.height);
```

  - 初期位置は現状の「X中央・Yはやや上寄せ（0.3）」バイアスを維持する。以下のように、新しいクランプ範囲（下記）の中で `minX〜maxX` の50%地点、`minY〜maxY` の30%地点に置くよう書き換える（`clampPhotoPosition()` 実装後、その min/max を再利用する形でよい）。

- `clampPhotoPosition()` を以下のロジックに置き換える（回転角に応じてクランプ範囲が変わる一般化版。回転角0のときは既存の `clamp(photoX, CANVAS_W - scaledW, 0)` と完全に一致することを確認すること）:

```js
function clampPhotoPosition() {
  if (!state.photo) return;
  const scaledW = state.photo.width * state.photoScale;
  const scaledH = state.photo.height * state.photoScale;
  const req = requiredCoverSize(state.photoRotationDeg);
  const minX = CANVAS_W / 2 + req.w / 2 - scaledW;
  const maxX = CANVAS_W / 2 - req.w / 2;
  const minY = CANVAS_H / 2 + req.h / 2 - scaledH;
  const maxY = CANVAS_H / 2 - req.h / 2;
  state.photoX = maxX < minX ? (minX + maxX) / 2 : clamp(state.photoX, minX, maxX);
  state.photoY = maxY < minY ? (minY + maxY) / 2 : clamp(state.photoY, minY, maxY);
}
```

- `applyZoom()` 内の `nextScale = state.baseScale * zoomFactor` はそのまま（`state.baseScale` が回転を考慮した値になっているため自動的に安全になる）。ただし **回転スライダーが変更されたときも `state.baseScale` を再計算し、`applyZoom(state.zoomFactor)` を呼び直して `clampPhotoPosition()` を再適用する**こと（回転角が変わるとcoverに必要な最小スケールが変わるため）。

- `drawBackground()` で実際に描画する部分を、キャンバス中心を軸に回転させてから描画するよう変更する:

```js
function drawBackground() {
  if (!state.photo) { /* 既存のプレースホルダー処理はそのまま */ return; }
  clampPhotoPosition();
  const scaledW = state.photo.width * state.photoScale;
  const scaledH = state.photo.height * state.photoScale;
  state.bounds.photo = { x: state.photoX, y: state.photoY, w: scaledW, h: scaledH };

  ctx.save();
  ctx.filter = `brightness(${state.photoBrightness}%)`; // 2章の明度調整と合わせて実装
  ctx.translate(CANVAS_W / 2, CANVAS_H / 2);
  ctx.rotate(state.photoRotationDeg * Math.PI / 180);
  ctx.translate(-CANVAS_W / 2, -CANVAS_H / 2);
  ctx.drawImage(state.photo, state.photoX, state.photoY, scaledW, scaledH);
  ctx.restore(); // filter, translate, rotateを確実に元に戻す
}
```

  - `pickTarget()` の写真ドラッグ判定（`contains({x:0,y:0,w:CANVAS_W,h:CANVAS_H}, point)`）は変更不要（キャンバス全体が写真のドラッグ可能域のまま）。

- `updateHiddenInputs()` に `photo_rotation_deg`（`state.photoRotationDeg`）と `photo_brightness`（後述）の反映を追加

#### 1-b. `templates/index.html`

- 「寄り引き」スライダーの直下あたりに、回転スライダーを追加:

```html
<label class="zoom-control">
  背景の回転
  <input type="range" id="photoRotationSlider" min="-15" max="15" value="0" step="1">
</label>
```

- hidden input を追加: `<input type="hidden" id="photoRotationInput" name="photo_rotation_deg" value="0">`

#### 1-c. `card_builder.py` / `app.py`（PDF生成側）

`generator.js` の「キャンバス座標系を回転させてから描画する」処理を、PILで **アフィン変換1回**（`Image.transform` with `Image.AFFINE`）で再現する。中間キャンバスを作って回転→クロップ、という手順は誤差や透明域が出やすいので使わない。

以下を `_cover_image_with_offset()` に追加する形で書き換える（`card_builder.py`）:

```python
def _required_cover_size(target_w: float, target_h: float, rotation_deg: float) -> tuple[float, float]:
    theta = math.radians(rotation_deg)
    req_w = abs(target_w * math.cos(theta)) + abs(target_h * math.sin(theta))
    req_h = abs(target_w * math.sin(theta)) + abs(target_h * math.cos(theta))
    return req_w, req_h


def _cover_image_with_offset(
    source: Image.Image,
    size: tuple[int, int],
    offset_mm: tuple[float, float] | None = None,
    scale_factor: float = 1.0,
    rotation_deg: float = 0.0,
    brightness_factor: float = 1.0,
) -> Image.Image:
    if brightness_factor != 1.0:
        source = ImageEnhance.Brightness(source).enhance(brightness_factor)

    if offset_mm is None:
        if rotation_deg == 0.0:
            return cover_image(source, size, x_bias=0.5, y_bias=0.3)
        # オフセット未指定でも回転がある場合は、中央基準のoffsetとして扱う
        target_w, target_h = size
        req_w, req_h = _required_cover_size(target_w, target_h, rotation_deg)
        base_scale = max(req_w / source.width, req_h / source.height)
        scaled_w = source.width * base_scale
        scaled_h = source.height * base_scale
        left = -(scaled_w - target_w) * 0.5
        top = -(scaled_h - target_h) * 0.3
        offset_mm = (left / mm(1.0), top / mm(1.0))  # 下の分岐と合流させるため mm 単位に変換

    target_w, target_h = size
    theta = math.radians(_clamp_rotation_deg(rotation_deg))
    req_w, req_h = _required_cover_size(target_w, target_h, rotation_deg)
    base_scale = max(req_w / source.width, req_h / source.height)
    scale = base_scale * max(1.0, scale_factor)
    resized_w = math.ceil(source.width * scale)
    resized_h = math.ceil(source.height * scale)

    # JSプレビューのphotoX/photoY(px)と同じ意味の「resized画像の左上位置」を求める
    req_left = target_w / 2 + req_w / 2 - resized_w
    req_right = target_w / 2 - req_w / 2
    req_top = target_h / 2 + req_h / 2 - resized_h
    req_bottom = target_h / 2 - req_h / 2
    left = _clamp(mm(offset_mm[0]), req_left, req_right)
    top = _clamp(mm(offset_mm[1]), req_top, req_bottom)

    if rotation_deg == 0.0:
        resized = source.resize((resized_w, resized_h), Image.Resampling.LANCZOS)
        front = Image.new("RGB", size)
        front.paste(resized, (round(left), round(top)))
        return front

    # 回転あり: 出力ピクセル(ox,oy) -> resized画像上のサンプリング座標 へのアフィン変換
    # (generator.js の translate(center)->rotate(theta)->translate(-center)->drawImage と等価)
    cos_t, sin_t = math.cos(theta), math.sin(theta)
    cw, ch = target_w / 2, target_h / 2
    a, b = cos_t, sin_t
    c = cw * (1 - cos_t) - sin_t * ch - left
    d, e = -sin_t, cos_t
    f = sin_t * cw + ch * (1 - cos_t) - top

    resized = source.resize((resized_w, resized_h), Image.Resampling.LANCZOS)
    front = resized.transform(
        size,
        Image.AFFINE,
        (a, b, c, d, e, f),
        resample=Image.Resampling.BICUBIC,
        fillcolor=(0, 0, 0),  # 数式上ここが使われることは無いはずの保険値
    )
    return front
```

- `build_custom_front()` の呼び出し部分に `rotation_deg=catchphrase_rotation_deg` のような取り違えが起きないよう、**新しい引数名は `photo_rotation_deg` / `photo_brightness_factor`** とし、既存の `catchphrase_rotation_deg` と明確に区別すること。`build_custom_front()` のシグネチャに `photo_rotation_deg: float = 0.0` と `photo_brightness_factor: float = 1.0` を追加し、`_cover_image_with_offset(...)` 呼び出しに渡す。
- `generate_pdf()` にも同様に `photo_rotation_deg`, `photo_brightness_factor` を引数追加し、`_clamp(photo_rotation_deg, -15.0, 15.0)` でサーバー側でも範囲をクランプする（クライアント側の改ざん対策）。
- `card_builder.py` の import 部分に既にある `from PIL import Image, ImageDraw, ImageEnhance, ImageFont` の `ImageEnhance` はそのまま使う（新規importは不要）。`import math` も既にある。

#### 1-d. `app.py`

- `_parse_float("photo_rotation_deg", 0.0)` を追加、`-15.0〜15.0` にサーバー側でもクランプしてから `generate_pdf(...)` に渡す
- 明度も同様に `_parse_float("photo_brightness", 100.0)` を受け取り、`brightness_factor = _clamp(value, 50.0, 150.0) / 100.0` に変換して渡す

---

## 2. 背景写真の明度調整（50%〜150%）

### 要件
- スライダー1本、範囲 **50%〜150%**、デフォルト **100%**（変化なし）
- 「明るい背景で文字が読めなくなる」問題への対策が主目的なので、**暗くする方向（50%側）を主に使う想定**だが両方向に対応する

### 実装
- `templates/index.html`: 回転スライダーの下あたりに追加

```html
<label class="zoom-control">
  背景の明るさ <span id="photoBrightnessValue">100%</span>
  <input type="range" id="photoBrightnessSlider" min="50" max="150" value="100" step="1">
</label>
```

  - hidden input: `<input type="hidden" id="photoBrightnessInput" name="photo_brightness" value="100">`

- `generator.js`:
  - `state.photoBrightness`（初期値 `100`）を追加
  - `photoBrightnessSlider` の `input` イベントで `state.photoBrightness = Number(value)` → `drawPreview()`
  - `drawBackground()` 内、`ctx.drawImage` 直前に `ctx.filter = \`brightness(${state.photoBrightness}%)\`` を設定し、`ctx.save()/ctx.restore()` のスコープ内に収める（**カード全体ではなく写真のみに効かせる**。ロゴ・セリフ・署名の描画には影響しないよう、`drawBackground()` の `ctx.save()...ctx.restore()` の中に filter設定を閉じ込めること。他の `drawXxx()` 関数には触れない）
  - `updateHiddenInputs()` に `inputs.photoBrightness.value = state.photoBrightness` を追加（`inputs` オブジェクトへの参照追加も忘れずに）

- `card_builder.py` / `app.py`: 上記1-cで実装済みの `brightness_factor` 引数をそのまま使う（`ImageEnhance.Brightness(source).enhance(brightness_factor)` を `_cover_image_with_offset()` の先頭で適用）

---

## 3. UIの配置

このPhaseでは「スライダーを各セクション直下に配置する」大規模UI改修（アコーディオン化等）は行わない。今回追加する2つのスライダー（回転・明度）は、既存の「寄り引き」スライダーのすぐ下に自然に並べる形で追加すればよい（大規模UI改修は別Phaseで対応予定）。

---

## 4. 動作確認の観点（実装後にClaude側でPython venvを使い実機確認する）

1. 写真アップロード → 回転スライダーを±15°まで動かし、プレビューcanvas上で角に透明/黒い隙間が出ないこと
2. 回転させた状態でドラッグ移動 → 移動可能範囲の端でも隙間が出ないこと（クランプが正しく効いていること）
3. 回転0°のとき、既存のドラッグ挙動・クランプ範囲が改修前と完全に一致すること（リグレッションがないこと）
4. 明度スライダーを50%/150%双方向に動かし、プレビューが暗く/明るくなること。ロゴ・セリフ・署名の色味には影響しないこと
5. フォーム送信 → 生成されたPDF（1ページ目=表面）を開き、プレビューと概ね同じ回転角・明るさ・トリミング位置になっていること（画角が透明にならず、印刷範囲61×97mm全面に写真が敷き詰められていること）
6. 回転・明度とも未操作（デフォルト値）で送信した場合、既存の出力と見た目が変わらないこと（回帰確認）
