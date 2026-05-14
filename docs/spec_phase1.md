# Phase 1 実装仕様書（Codex CLI用）

## 概要
メスケモ推進委員会サイトの軽微修正 Phase 1。  
対象ファイル: `style.css`, `index.html`, `script.js`

---

## タスク 1: ドロワーメニューを右側に変更（style.css）

### 変更箇所
`style.css` の `.side-drawer`（366〜386行目）

### 変更前
```css
.side-drawer {
    position: fixed;
    top: 0;
    left: 0;
    width: 260px;
    height: 100%;
    background: rgba(20, 12, 8, 0.97);
    border-right: 2px solid rgba(212, 175, 55, 0.4);
    backdrop-filter: blur(16px);
    z-index: 900;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.side-drawer.open {
    transform: translateX(0);
}
```

### 変更後
```css
.side-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 260px;
    height: 100%;
    background: rgba(20, 12, 8, 0.97);
    border-left: 2px solid rgba(212, 175, 55, 0.4);
    backdrop-filter: blur(16px);
    z-index: 900;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.side-drawer.open {
    transform: translateX(0);
}
```

**変更ポイント:**
- `left: 0` → `right: 0`
- `border-right` → `border-left`
- `translateX(-100%)` → `translateX(100%)`

**JS変更は不要。** `.open` クラスの付け外しのみで動作する。

---

## タスク 2: キャスト注意書き追加（index.html）

### 変更箇所
`index.html` の `<h2>キャストメンバー</h2>` の直後（約340行目）

### 変更前
```html
<div class="content-card" id="castCard">
    <h2>キャストメンバー</h2>

    <!-- 検索バー -->
    <div class="search-container">
```

### 変更後
```html
<div class="content-card" id="castCard">
    <h2>キャストメンバー</h2>

    <!-- キャスト注意書き -->
    <p class="cast-notice">※一部メンバーのみ掲載しております</p>

    <!-- 検索バー -->
    <div class="search-container">
```

### スタイル追加（style.css に追記）
適切な場所（キャスト関連CSSのセクション）に以下を追加:
```css
/* キャスト注意書き */
.cast-notice {
    text-align: center;
    color: rgba(245, 243, 237, 0.6);
    font-size: 0.9rem;
    margin-bottom: var(--spacing-lg);
    margin-top: calc(var(--spacing-sm) * -1);
}
```

---

## タスク 3: 「公式サイト」→「サイトリンク」に変更（index.html）

**3箇所** を変更する。

### 変更箇所 1: スマホドロワーメニュー（約69〜70行目）
```html
<!-- 変更前 -->
<button class="drawer-item" data-tab="official" role="tab" aria-selected="false" aria-controls="official">
    公式サイト

<!-- 変更後 -->
<button class="drawer-item" data-tab="official" role="tab" aria-selected="false" aria-controls="official">
    サイトリンク
```

### 変更箇所 2: PCタブボタン（約98〜99行目）
```html
<!-- 変更前 -->
<button class="tab-button" data-tab="official" role="tab" aria-selected="false" aria-controls="official">
    公式サイト

<!-- 変更後 -->
<button class="tab-button" data-tab="official" role="tab" aria-selected="false" aria-controls="official">
    サイトリンク
```

### 変更箇所 3: タブコンテンツの見出し（約396行目）
```html
<!-- 変更前 -->
<h2>公式サイト</h2>

<!-- 変更後 -->
<h2>サイトリンク</h2>
```

---

## タスク 4: takanisoさんのコメント変更（script.js）

### 変更箇所
`script.js` の `castData` 配列、`id: 1` のエントリ（約20〜28行目）

### 変更前
```js
{
    id: 1,
    name: 'takaniso',
    yomi: 'たかにそ takaniso',
    role: 'オーナー',
    image: 'images/cast/takaniso.png',
    detailImage: 'images/cast/takaniso_original.png',
    description: 'ここに挨拶文や紹介を入れてください。',
    size: 'medium',
},
```

### 変更後
```js
{
    id: 1,
    name: 'takaniso',
    yomi: 'たかにそ takaniso',
    role: 'オーナー',
    image: 'images/cast/takaniso.png',
    detailImage: 'images/cast/takaniso_original.png',
    description: 'なでなで茶屋はメスケモの楽園…ゆっくりして心を癒してくださいね',
    size: 'medium',
},
```

**変更するのは `description` フィールドのみ。他のキャストは変更しない。**

---

## 動作確認チェックリスト

- [ ] スマホ幅でドロワーが右側から出てくるか
- [ ] PCタブで「サイトリンク」と表示されるか
- [ ] スマホドロワーで「サイトリンク」と表示されるか
- [ ] 「サイトリンク」タブ内見出しが変わっているか
- [ ] キャスト一覧の上部に注意書きが表示されるか
- [ ] takanisoのdescriptionが更新されているか

---

## 注意事項
- `npm run dev` は既に起動中。重複起動しないこと
- `npm install` も不要
- 修正後は `npm run format` を実行してコードスタイルを統一する
