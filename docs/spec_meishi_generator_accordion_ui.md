# 名刺ジェネレーター（print-card/generator/）— UI大改修（アコーディオン化・スライダー再配置・セクション別リセット）

対象ディレクトリ: `print-card/generator/`
[[spec_meishi_generator_photo_rotate_brightness.md]] [[spec_meishi_generator_extra_images.md]] [[spec_meishi_generator_font_presets.md]] で実装済みの機能・ロジックには一切手を加えない。**このPhaseは「既存要素の再配置とリセット機能の追加」のみ**であり、描画ロジック（`drawXxx()`系）やPDF生成ロジック（`card_builder.py`）は変更しない。

対象ファイル:
- `print-card/generator/templates/index.html`（構造・CSSの再編成）
- `print-card/generator/static/generator.js`（セクション別リセット関数の追加のみ）

---

## 重要な制約

- **既存の要素の `id` / `name` は一切変更しないこと**（`generator.js` が `document.getElementById(...)` でこれらを参照しているため、id/nameを変えると動作しなくなる）。今回やるのは「どの親要素の中に配置するか」の移動と、新しいラッパー（`<details>`）・新しいリセットボタンの追加だけ
- 現在「入力欄」（`.fields` 列）と「スライダー類」（`.preview-panel` 列）が分離しているのを、**セクションごとに1箇所へ集約**する。集約先は `.fields` 列側（アコーディオンとして開閉できるようにする）。`.preview-panel` 列にはプレビューcanvasとドラッグ説明文だけを残す
- アコーディオンはJSを新規に書かず、ネイティブの `<details>`/`<summary>` 要素を使う（アクセシビリティ・キーボード操作が標準で効き、実装もシンプルになる）

---

## 1. セクション構成（最終形）

`.fields` 内を、以下6つの `<details class="accordion-section">` に再編成する。**「写真」だけ初期状態で開いておき（`open`属性）、残り5つは初期状態で閉じておく**（`open`属性なし）。

1. **写真**（`id="photoSection"`）
   - 中身: 既存の `photoInput`
   - 移動してくる: 既存 `.preview-panel` 内の「寄り引き」(`zoomSlider`)・「背景の回転」(`photoRotationSlider`)・「背景の明るさ」(`photoBrightnessSlider`)
   - 新規: リセットボタン `id="photoResetBtn"`

2. **フォント**（`id="fontSection"`）
   - 中身: 既存の `fontSelect`
   - 新規: リセットボタン `id="fontResetBtn"`

3. **追加画像**（`id="extraImagesSection"`）
   - 中身: 既存の `.extra-images-fieldset` の中身（`extra1〜3` の3ブロック）をそのまま移動。外側の `<fieldset>`/`<legend>` は `<details>`/`<summary>` に統合するので取り除いてよい（中の3つの `.extra-image-block` はそのまま）
   - 各スロットに既にある「この画像を削除」ボタンがそのままセクション内リセットとして機能するので、追加のリセットボタンは不要

4. **セリフ**（`id="catchphraseSection"`）
   - 中身: 既存の `catchphraseInput`（textarea）
   - 移動してくる: 既存 `.preview-panel` 内の「書字方向」セグメント・「回転」(`catchphraseRotationSlider`)・「セリフサイズ」(`catchphraseSizeSlider`)・「縁取り」(`catchphraseStrokeSlider`)・「文字色」セグメント
   - 新規: リセットボタン `id="catchphraseResetBtn"`

5. **名前・X ID**（`id="nameSection"`）
   - 中身: 既存の `nameInput`、既存の `nameSizeSlider`（既にこの近くにあるのでそのまま）、既存の `xHandleInput`
   - 新規: リセットボタン `id="nameResetBtn"`

6. **ロゴ**（`id="logoSection"`）
   - 移動してくる: 既存 `.preview-panel` 内の `logoToggle`
   - 新規: リセットボタン `id="logoResetBtn"`

`<button type="submit">CMYK PDFを生成</button>` は全アコーディオンの**外側・最後**にそのまま残す（`.fields` の末尾）。

`.preview-panel` に最終的に残るのは、`<div class="canvas-wrap">`（canvas）と末尾の説明文 `<p>` だけになる。

---

## 2. HTML構造（`templates/index.html`）

`<style>` に以下を追加する:

```css
.accordion-section {
  border: 1px solid #e2d6c4;
  border-radius: 8px;
  background: #fffdfa;
  overflow: hidden;
}
.accordion-section > summary {
  cursor: pointer;
  padding: 12px 14px;
  font-weight: 700;
  font-size: 14px;
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f8f1e4;
}
.accordion-section > summary::-webkit-details-marker {
  display: none;
}
.accordion-section > summary::after {
  content: "+";
  font-weight: 700;
  color: #6c5a4a;
}
.accordion-section[open] > summary::after {
  content: "−";
}
.accordion-section > summary:hover {
  background: #f1e6d2;
}
.accordion-body {
  padding: 14px;
  display: grid;
  gap: 14px;
}
.section-reset-btn {
  justify-self: start;
  background: #efe6d6;
  color: #2f211b;
  font-size: 13px;
  padding: 8px 14px;
}
.section-reset-btn:hover {
  background: #e4d7bd;
}
```

（`button` の基本スタイルは既存のものを継承しつつ、`.section-reset-btn` で小さめ・控えめな配色に上書きする）

`.fields` 内を以下の構造に置き換える。**中身の各input/label/hidden inputは既存のものをそのまま移動するだけで、属性は変更しない**:

```html
<div class="fields">

  <details class="accordion-section" id="photoSection" open>
    <summary>写真</summary>
    <div class="accordion-body">
      <label>
        写真
        <input id="photoInput" type="file" name="photo" accept="image/*" required>
      </label>
      <label class="zoom-control">
        寄り引き
        <input type="range" id="zoomSlider" min="100" max="250" value="100" step="1">
      </label>
      <label class="zoom-control">
        背景の回転
        <input type="range" id="photoRotationSlider" min="-15" max="15" value="0" step="1">
      </label>
      <label class="zoom-control">
        背景の明るさ <span id="photoBrightnessValue">100%</span>
        <input type="range" id="photoBrightnessSlider" min="50" max="150" value="100" step="1">
      </label>
      <button type="button" class="section-reset-btn" id="photoResetBtn">写真の調整をリセット</button>
    </div>
  </details>

  <details class="accordion-section" id="fontSection">
    <summary>フォント</summary>
    <div class="accordion-body">
      <label>
        フォント
        <select id="fontSelect" name="font_key_select">
          <option value="noto-serif-jp" selected>明朝（Noto Serif JP）</option>
          <option value="zen-maru-gothic">丸ゴシック（Zen Maru Gothic）</option>
          <option value="zen-kaku-gothic-new">角ゴシック（Zen Kaku Gothic New）</option>
          <option value="kaisei-decol">装飾明朝（Kaisei Decol）</option>
          <option value="yuji-syuku">筆文字（Yuji Syuku）</option>
        </select>
      </label>
      <button type="button" class="section-reset-btn" id="fontResetBtn">フォントをリセット</button>
    </div>
  </details>

  <details class="accordion-section" id="extraImagesSection">
    <summary>追加画像（最大3枚・任意）</summary>
    <div class="accordion-body">
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
      <div class="extra-image-block">
        <label>追加画像2<input type="file" id="extra2Input" name="extra2_image" accept="image/*"></label>
        <label class="catchphrase-control">サイズ<input type="range" id="extra2ScaleSlider" min="30" max="250" value="100" step="1"></label>
        <label class="catchphrase-control">回転<input type="range" id="extra2RotationSlider" min="-180" max="180" value="0" step="1"></label>
        <button type="button" id="extra2ClearBtn">この画像を削除</button>
        <input type="hidden" id="extra2XInput" name="extra2_x_mm">
        <input type="hidden" id="extra2YInput" name="extra2_y_mm">
        <input type="hidden" id="extra2ScaleInput" name="extra2_scale">
        <input type="hidden" id="extra2RotationInput" name="extra2_rotation_deg">
      </div>
      <div class="extra-image-block">
        <label>追加画像3<input type="file" id="extra3Input" name="extra3_image" accept="image/*"></label>
        <label class="catchphrase-control">サイズ<input type="range" id="extra3ScaleSlider" min="30" max="250" value="100" step="1"></label>
        <label class="catchphrase-control">回転<input type="range" id="extra3RotationSlider" min="-180" max="180" value="0" step="1"></label>
        <button type="button" id="extra3ClearBtn">この画像を削除</button>
        <input type="hidden" id="extra3XInput" name="extra3_x_mm">
        <input type="hidden" id="extra3YInput" name="extra3_y_mm">
        <input type="hidden" id="extra3ScaleInput" name="extra3_scale">
        <input type="hidden" id="extra3RotationInput" name="extra3_rotation_deg">
      </div>
    </div>
  </details>

  <details class="accordion-section" id="catchphraseSection">
    <summary>セリフ</summary>
    <div class="accordion-body">
      <label>
        セリフ
        <textarea id="catchphraseInput" name="catchphrase">{{ values.get("catchphrase", "") }}</textarea>
      </label>
      <div class="segmented-control" role="radiogroup" aria-label="セリフの書字方向">
        <span>書字方向</span>
        <label><input type="radio" name="catchphrase_orientation_ui" value="vertical" checked>縦書き</label>
        <label><input type="radio" name="catchphrase_orientation_ui" value="horizontal">横書き</label>
      </div>
      <label class="catchphrase-control">
        回転
        <input type="range" id="catchphraseRotationSlider" min="-45" max="45" value="0" step="1">
      </label>
      <label class="catchphrase-control">
        セリフサイズ
        <input type="range" id="catchphraseSizeSlider" min="60" max="180" value="100" step="1">
      </label>
      <label class="catchphrase-control">
        縁取り
        <input type="range" id="catchphraseStrokeSlider" min="0" max="200" value="100" step="1">
      </label>
      <div class="segmented-control" role="radiogroup" aria-label="セリフの文字色">
        <span>文字色</span>
        <label><input type="radio" name="catchphrase_fill_color_ui" value="white" checked>白</label>
        <label><input type="radio" name="catchphrase_fill_color_ui" value="black">黒</label>
      </div>
      <button type="button" class="section-reset-btn" id="catchphraseResetBtn">セリフの見た目をリセット</button>
    </div>
  </details>

  <details class="accordion-section" id="nameSection">
    <summary>名前・X ID</summary>
    <div class="accordion-body">
      <label>
        名前
        <input id="nameInput" type="text" name="name" value="{{ values.get('name', '') }}" required>
      </label>
      <label class="catchphrase-control">
        名前・X IDの文字サイズ
        <input type="range" id="nameSizeSlider" min="70" max="150" value="100" step="1">
      </label>
      <label>
        Xアカウント
        <input id="xHandleInput" type="text" name="x_handle" value="{{ values.get('x_handle', '') }}" placeholder="@example" required>
      </label>
      <button type="button" class="section-reset-btn" id="nameResetBtn">名前・X IDの見た目をリセット</button>
    </div>
  </details>

  <details class="accordion-section" id="logoSection">
    <summary>ロゴ</summary>
    <div class="accordion-body">
      <label class="logo-toggle">
        <input type="checkbox" id="logoToggle" name="show_logo" checked>
        左下ロゴを表示
      </label>
      <button type="button" class="section-reset-btn" id="logoResetBtn">ロゴ表示をリセット</button>
    </div>
  </details>

  <input type="hidden" id="photoOffsetXInput" name="photo_offset_x_mm">
  <input type="hidden" id="photoOffsetYInput" name="photo_offset_y_mm">
  <input type="hidden" id="photoScaleInput" name="photo_scale">
  <input type="hidden" id="photoRotationInput" name="photo_rotation_deg" value="0">
  <input type="hidden" id="photoBrightnessInput" name="photo_brightness" value="100">
  <input type="hidden" id="fontKeyInput" name="font_key" value="noto-serif-jp">
  <input type="hidden" id="nameSizeFactorInput" name="name_size_factor" value="1">
  <input type="hidden" id="nameXInput" name="name_x_mm">
  <input type="hidden" id="nameYInput" name="name_y_mm">
  <input type="hidden" id="catchphraseXInput" name="catchphrase_x_mm">
  <input type="hidden" id="catchphraseYInput" name="catchphrase_y_mm">
  <input type="hidden" id="catchphraseOrientationInput" name="catchphrase_orientation" value="vertical">
  <input type="hidden" id="catchphraseRotationInput" name="catchphrase_rotation_deg" value="0">
  <input type="hidden" id="catchphraseSizeFactorInput" name="catchphrase_size_factor" value="1">
  <input type="hidden" id="catchphraseStrokeFactorInput" name="catchphrase_stroke_factor" value="1">
  <input type="hidden" id="catchphraseFillColorInput" name="catchphrase_fill_color" value="white">

  <button type="submit">CMYK PDFを生成</button>
</div>
```

（hidden inputは見た目に関係しないので、どこに置いても良いが、既存の並び順のままアコーディオンの外・送信ボタンの直前にまとめて置く形にする）

`.preview-panel` は以下のように縮小する:

```html
<section class="preview-panel" aria-label="名刺プレビュー">
  <div class="canvas-wrap">
    <canvas id="cardPreview" width="610" height="970"></canvas>
  </div>
  <p>写真・名前・セリフ・追加画像はプレビュー上でドラッグできます。写真はスライダーで寄り引きできます。</p>
</section>
```

---

## 3. `generator.js` — セクション別リセット関数の追加

既存の `resetPhotoPosition()` を、回転・明度も一緒にリセットするよう拡張する:

```js
function resetPhotoPosition() {
  // (既存の写真位置・zoomFactorリセット処理はそのまま)
  ...既存の中身...

  state.photoRotationDeg = 0;
  state.photoBrightness = 100;
  if (inputs.photoRotationSlider) inputs.photoRotationSlider.value = 0;
  if (inputs.photoBrightnessSlider) inputs.photoBrightnessSlider.value = 100;
  if (inputs.photoBrightnessValue) inputs.photoBrightnessValue.textContent = '100%';
}
```

（`state.baseScale` 等の再計算部分は既存のまま。既に `photoRotationDeg` を使って計算しているので、`photoRotationDeg` を0に戻してから既存の計算ロジックを走らせれば整合する）

新規に以下を追加する（末尾のイベントリスナー登録部分に併記）:

```js
document.getElementById('photoResetBtn')?.addEventListener('click', () => {
  resetPhotoPosition();
  drawPreview();
});

document.getElementById('fontResetBtn')?.addEventListener('click', () => {
  state.fontKey = DEFAULT_FONT_KEY;
  if (inputs.fontSelect) inputs.fontSelect.value = DEFAULT_FONT_KEY;
  drawPreview();
});

document.getElementById('catchphraseResetBtn')?.addEventListener('click', () => {
  // テキスト本文は消さない。見た目の設定と位置だけリセットする
  const orientationDefault = document.querySelector('input[name="catchphrase_orientation_ui"][value="vertical"]');
  if (orientationDefault) orientationDefault.checked = true;
  const fillDefault = document.querySelector('input[name="catchphrase_fill_color_ui"][value="white"]');
  if (fillDefault) fillDefault.checked = true;
  if (inputs.catchphraseRotationSlider) inputs.catchphraseRotationSlider.value = 0;
  if (inputs.catchphraseSizeSlider) inputs.catchphraseSizeSlider.value = 100;
  if (inputs.catchphraseStrokeSlider) inputs.catchphraseStrokeSlider.value = 100;
  state.catchphraseMoved = false;
  drawPreview();
});

document.getElementById('nameResetBtn')?.addEventListener('click', () => {
  // 名前・Xアカウントの入力文字列は消さない。サイズと位置だけリセットする
  state.nameSizeFactor = 1;
  if (inputs.nameSizeSlider) inputs.nameSizeSlider.value = 100;
  state.nameMoved = false;
  drawPreview();
});

document.getElementById('logoResetBtn')?.addEventListener('click', () => {
  if (inputs.logoToggle) inputs.logoToggle.checked = true;
  drawPreview();
});
```

`inputs` オブジェクトに `fontSelect`, `catchphraseRotationSlider`, `catchphraseSizeSlider`, `catchphraseStrokeSlider`, `nameSizeSlider`, `logoToggle`, `photoRotationSlider`, `photoBrightnessSlider`, `photoBrightnessValue` は既にキャッシュ済みのはずなので、そのまま参照する（無ければ追加すること）。

**リセットの設計方針**（重要・実装時に守ること）:
- 「セリフ」「名前・X ID」のリセットは、**ユーザーが入力したテキスト本文を消さない**（見た目の調整＝回転・サイズ・縁取り・色・位置のみを初期値に戻す）。誤操作でテキストロスにならないようにするための意図的な設計
- 「写真」のリセットは、アップロード済みの画像自体は消さず、位置・寄り引き・回転・明度だけを初期値に戻す
- 「追加画像」は、既存の「この画像を削除」ボタンがそのままスロット単位のフルリセット（画像もクリア）として機能する。これは新規追加不要

---

## 4. 動作確認の観点

1. ページ読み込み直後、「写真」セクションだけが開いていて、他5セクションは閉じていること
2. 各セクションの `<summary>` をクリックして開閉できること（キーボードのEnter/Spaceでも開閉できること）
3. 全てのスライダー・入力欄が、対応するアコーディオンの中に過不足なく収まっていること（`.preview-panel` にはcanvasと説明文以外何も残っていないこと）
4. 各セクションのリセットボタンが、そのセクションの調整値だけを初期値に戻し、他セクションやテキスト本文に影響しないこと
5. モバイル幅（760px以下）でも各アコーディオンが崩れず操作できること
6. リセット後も含め、フォーム送信 → PDF生成が従来通り成功すること（回帰確認）
7. 全ての既存 `id`/`name` がJS側の参照と一致しており、コンソールエラーが出ていないこと
