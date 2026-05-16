# 仕様書：ダウンロード解像度選択ボタン

## 目的

カードジェネレーターのダウンロード時に解像度（1x / 2x / 3x）をユーザーが選択できるようにする。

---

## 変更ファイル

- `secret-card.html`
- `card-style.css`
- `card-generator.js`

---

## 実装方針

### 解像度の定義

| ボタンラベル | 倍率 | 出力サイズ |
|---|---|---|
| 標準 (1x) | 1 | 1024 × 650 px |
| 高画質 (2x) | 2 | 2048 × 1300 px |
| 超高画質 (3x) | 3 | 3072 × 1950 px |

デフォルト選択: **2x（高画質）**

---

## 1. `secret-card.html` の変更

`#downloadSection` 内の `btn-download` ボタンの直前に、解像度選択UIを追加する。

```html
<!-- 解像度選択 -->
<div class="resolution-selector">
  <p class="resolution-label">ダウンロード画質</p>
  <div class="resolution-btn-group">
    <button type="button" class="btn-resolution" data-scale="1">標準<span class="resolution-size">1024×650</span></button>
    <button type="button" class="btn-resolution active" data-scale="2">高画質<span class="resolution-size">2048×1300</span></button>
    <button type="button" class="btn-resolution" data-scale="3">超高画質<span class="resolution-size">3072×1950</span></button>
  </div>
</div>
```

---

## 2. `card-style.css` の変更

解像度ボタン用のスタイルを追加する。既存の `.btn-download` のすぐ下あたりに追記する。

```css
/* 解像度選択UI */
.resolution-selector {
  margin-bottom: 12px;
  text-align: center;
}

.resolution-label {
  font-size: 0.75rem;
  color: rgba(245, 243, 237, 0.7);
  margin-bottom: 8px;
}

.resolution-btn-group {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-resolution {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 14px;
  background: rgba(245, 243, 237, 0.08);
  border: 1px solid rgba(245, 243, 237, 0.2);
  border-radius: 8px;
  color: rgba(245, 243, 237, 0.85);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  font-family: inherit;
}

.btn-resolution .resolution-size {
  font-size: 0.65rem;
  color: rgba(245, 243, 237, 0.5);
}

.btn-resolution:hover {
  background: rgba(245, 243, 237, 0.15);
  border-color: rgba(212, 175, 55, 0.5);
}

.btn-resolution.active {
  background: rgba(212, 175, 55, 0.2);
  border-color: #d4af37;
  color: #d4af37;
}

.btn-resolution.active .resolution-size {
  color: rgba(212, 175, 55, 0.7);
}

/* スマホ：ボタンを縦並びではなく横並びのまま小さくする */
@media (max-width: 600px) {
  .btn-resolution {
    padding: 6px 10px;
    font-size: 0.75rem;
  }
  .btn-resolution .resolution-size {
    font-size: 0.6rem;
  }
}
```

---

## 3. `card-generator.js` の変更

### 3-1. 状態変数の追加

ファイル冒頭の状態管理変数の近く（`let photoImage = null;` などがある付近）に追加する。

```js
// ダウンロード解像度の倍率（1/2/3）
let downloadScale = 2;
```

### 3-2. `drawCard(ctx, scale)` 共通描画関数の抽出

現在の `drawPreviewCard()` は `cardCanvas` に直接描画しているが、ダウンロード時に任意サイズのオフスクリーンcanvasへも描画できるよう、描画ロジックを共通関数 `drawCard(ctx, scale)` に切り出す。

**変更前のイメージ:**
```js
function drawPreviewCard() {
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width  = CARD_W;
    canvas.height = CARD_H;
    // ... 描画ロジック（CARD_W/CARD_H を直接参照） ...
}
```

**変更後のイメージ:**

```js
// 実描画ロジック（ctx と scale を受け取る）
function drawCard(ctx, scale = 1) {
    const W = CARD_W * scale;
    const H = CARD_H * scale;

    // scale を ctx に適用
    ctx.save();
    ctx.scale(scale, scale);

    const cardType = document.getElementById('cardType').value;
    const theme    = THEMES[cardType] || THEMES.regular;

    // --- 背景 ---
    // (既存の背景描画ロジックをそのまま移植。CARD_W/CARD_H はそのまま使用 → scale で拡大される)
    // ...（既存コードをここに移植）...

    ctx.restore();
}

// プレビュー描画（cardCanvas に scale=1 で描画）
function drawPreviewCard() {
    const canvas = document.getElementById('cardCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = CARD_W;
    canvas.height = CARD_H;
    drawCard(ctx, 1);
}
```

**重要な注意点:**
- `ctx.scale(scale, scale)` を適用したあと、既存の全描画命令（fillRect, drawImage, fillText, arc 等）はそのまま CARD_W/CARD_H ベースの座標で動作してよい。スケール変換が自動的に拡大する。
- `ctx.save()` / `ctx.restore()` で scale の影響をスコープ内に閉じ込める。
- フォントサイズも `scale` で自動拡大されるため、個別修正は不要。
- `drawCard` 内で `CARD_W`/`CARD_H` を参照している箇所は変更不要（scale変換で対応）。

### 3-3. `downloadCard()` の変更

オフスクリーンcanvasを `downloadScale` 倍サイズで作成し、`drawCard` で描画してダウンロードする。

```js
function downloadCard() {
    const scale    = downloadScale;
    const offscreen = document.createElement('canvas');
    offscreen.width  = CARD_W * scale;
    offscreen.height = CARD_H * scale;
    const ctx = offscreen.getContext('2d');

    drawCard(ctx, scale);

    const userName = document.getElementById('userName').value.trim() || 'member';
    const link     = document.createElement('a');
    link.download  = `mesukemo-card-${userName}_${scale}x.png`;
    link.href      = offscreen.toDataURL('image/png');
    link.click();
}
```

### 3-4. 解像度ボタンのイベントリスナー追加

初期化処理（`DOMContentLoaded` 内の他のイベントリスナー登録と同じ場所）に追加する。

```js
// 解像度選択ボタン
document.querySelectorAll('.btn-resolution').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-resolution').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        downloadScale = parseInt(btn.dataset.scale, 10);
    });
});
```

---

## 完成後の動作

1. カード生成後のダウンロードセクションに「標準 / 高画質 / 超高画質」ボタンが表示される（デフォルトは「高画質」が選択済み）。
2. ボタンをクリックすると選択状態（gold枠）が切り替わる。
3. 「カードをダウンロード」ボタンを押すと選択した倍率でオフスクリーン描画し、`mesukemo-card-名前_2x.png` のようなファイル名でダウンロードされる。
4. プレビュー（cardCanvas）は常に 1024×650 のまま変わらない。

---

## 注意事項

- `drawCard(ctx, scale)` の中では `ctx.save()` / `ctx.scale()` / `ctx.restore()` を必ず使うこと。`drawPreviewCard()` は scale=1 で呼び出すため、既存の表示に影響しない。
- 3x はファイルサイズが大きくなる（目安: 3〜8MB程度）ため、将来的に警告文を追加することを検討してよい（今回は不要）。
