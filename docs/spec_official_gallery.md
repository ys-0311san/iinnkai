# 仕様書：サイトリンクタブ 隠れキャストギャラリー実装

## 概要

KEMONO写真館（`#events-kemono`）と同じ「キャストがセクション底部からひょっこり顔を出す」演出を
サイトリンクタブ（`#official-main`）にも追加する。

---

## 変更対象ファイル

1. `index.html`
2. `script.js`
3. `style.css`

---

## 1. `index.html` の変更

### 変更箇所

`#official-main` の `.content-card` の直後（`</div>` 閉じタグの前）に
`.kemono-gallery-section` ブロックを追加する。

```html
<!-- 変更前 -->
<div class="sub-section active" id="official-main">
    <div class="content-card">
        <h2>サイトリンク</h2>
        <div class="official-links">
            ...
        </div>
    </div>
</div>

<!-- 変更後 -->
<div class="sub-section active" id="official-main">
    <div class="content-card">
        <h2>サイトリンク</h2>
        <div class="official-links">
            ...
        </div>
    </div>
    <!-- キャストギャラリー（ランダム4名） -->
    <div class="kemono-gallery-section">
        <div class="kemono-gallery-grid" id="officialGallery"></div>
    </div>
</div>
```

---

## 2. `script.js` の変更

### 2-1. `initKemonoGallery()` を複数コンテナ対応に汎用化

引数 `containerId`（デフォルト `'kemonoGallery'`）を受け取れるよう変更する。
関数の中身は変えず、`getElementById` の対象IDだけを引数化する。

```js
/* 変更前 */
function initKemonoGallery() {
    const container = document.getElementById('kemonoGallery');
    if (!container) return;

    const shuffled = [...kemonoCastList];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    container.innerHTML = shuffled.slice(0, 4).map((name) => `
        <div class="kemono-gallery-item">
            <img src="images/cast/${name}.png" alt="${name}" loading="lazy">
        </div>
    `).join('');
}

/* 変更後 */
function initKemonoGallery(containerId = 'kemonoGallery') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const shuffled = [...kemonoCastList];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    container.innerHTML = shuffled.slice(0, 4).map((name) => `
        <div class="kemono-gallery-item">
            <img src="images/cast/${name}.png" alt="${name}" loading="lazy">
        </div>
    `).join('');
}
```

### 2-2. `DOMContentLoaded` 内の呼び出しに `officialGallery` を追加

```js
/* 変更前 */
initKemonoGallery();

/* 変更後 */
initKemonoGallery();
initKemonoGallery('officialGallery');
```

---

## 3. `style.css` の変更

### 3-1. `#official-main` にポジション・高さ設定を追加

`#events-kemono` と同じ仕組みを `#official-main` にも適用する。

```css
/* 追加（#events-kemono の定義の近くに追記） */
#official-main {
    position: relative;
    min-height: calc(100vh + 150px);
    overflow: hidden;
}
```

---

## 動作確認チェックリスト

- [ ] サイトリンクタブを開いたとき、セクション底部にキャストが4名表示される
- [ ] ページリロードのたびに表示キャストがランダムに変わる
- [ ] KEMONO写真館のキャスト表示は引き続き正常に動作している（既存機能に影響なし）
- [ ] PC・モバイル両方で表示が崩れていない
- [ ] `.kemono-gallery-section` の `pointer-events: none` によりリンクの操作を妨げない
