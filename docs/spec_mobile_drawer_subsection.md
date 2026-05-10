# 仕様書：スマホ版ドロワーにイベント概要・Q&A を統合

## 目的

スマホ表示（≤768px）において、aboutタブ内のサブセクション切替（イベント概要 / Q&A）を
コンテンツ内の横タブバー（`.section-sidebar`）ではなく、
ドロワー（ハンバーガーメニュー）のみで操作できるようにする。

---

## 変更ファイル

1. `index.html` — ドロワーメニューのHTML構造変更
2. `style.css` — スマホ時の `.section-sidebar` 非表示
3. `script.js` — ドロワーアイテムのクリック処理・アクティブ状態管理を拡張

---

## 1. index.html の変更

**変更箇所：** `<ul class="drawer-nav">` ブロック（L52〜L73付近）

### 変更前

```html
<ul class="drawer-nav" role="tablist">
    <li>
        <button class="drawer-item active" data-tab="about" role="tab" aria-selected="true" aria-controls="about">
            イベントについて
        </button>
    </li>
    <li>
        <button class="drawer-item" data-tab="cast" role="tab" aria-selected="false" aria-controls="cast">
            キャスト
        </button>
    </li>
    <li>
        <button class="drawer-item" data-tab="official" role="tab" aria-selected="false" aria-controls="official">
            公式サイト
        </button>
    </li>
    <li>
        <button class="drawer-item" data-tab="news" role="tab" aria-selected="false" aria-controls="news">
            🔔 お知らせ
        </button>
    </li>
</ul>
```

### 変更後

```html
<ul class="drawer-nav" role="tablist">
    <li>
        <button class="drawer-item active" data-tab="about" data-section="about-main" role="tab" aria-selected="true" aria-controls="about">
            イベント概要
        </button>
    </li>
    <li>
        <button class="drawer-item" data-tab="about" data-section="about-faq" role="tab" aria-selected="false" aria-controls="about">
            Q&A
        </button>
    </li>
    <li>
        <button class="drawer-item" data-tab="cast" role="tab" aria-selected="false" aria-controls="cast">
            キャスト
        </button>
    </li>
    <li>
        <button class="drawer-item" data-tab="official" role="tab" aria-selected="false" aria-controls="official">
            公式サイト
        </button>
    </li>
    <li>
        <button class="drawer-item" data-tab="news" role="tab" aria-selected="false" aria-controls="news">
            🔔 お知らせ
        </button>
    </li>
</ul>
```

**変更点:**
- 「イベントについて」ボタンを削除
- 「イベント概要」（data-section="about-main"）と「Q&A」（data-section="about-faq"）を新規追加
- どちらも `data-tab="about"` を持ち、`data-section` でサブセクションIDを指定

---

## 2. style.css の変更

スマホ（`@media (max-width: 768px)`）内で `.section-sidebar` を非表示にする。

**変更箇所：** L574〜L630付近の `@media (max-width: 768px)` ブロック内

既存の `.section-sidebar { display: block; ... }` ルールを以下に変更：

```css
/* スマホではサイドバータブバーを非表示（ドロワーで代替） */
.section-sidebar {
    display: none;
}
```

（`!important` はなくてよい。既存の `display: block` が同スコープにあるので、それを `display: none` に書き換える）

---

## 3. script.js の変更

### 3-1. ドロワーアイテムのクリックハンドラー拡張

**変更箇所：** `tabButtons` のクリックイベント登録部分（L504付近）

`tabButtons` は `.tab-button, .drawer-item` の両方を含む querySelector で取得されている。
現在のクリックハンドラーを以下のように拡張する：

```js
tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        const sectionId = btn.dataset.section || null; // 追加

        // 既存のタブ切替処理（変更なし）
        // ... （既存コードをそのまま残す）

        // サブセクション切替（data-section がある場合のみ）
        if (sectionId) {
            activateSubSection(tabId, sectionId);
        }

        // ドロワーを閉じる（既存処理があれば不要）
    });
});
```

> ⚠️ 既存のクリックハンドラーがすでにある場合は、そのハンドラー内に `data-section` 対応を追加するだけでよい。
> イベントリスナーを二重登録しないこと。

### 3-2. ドロワーアイテムのアクティブ状態管理

タブ切替時にドロワーのアクティブ状態を更新する既存処理を拡張する。

`drawer-item` のアクティブ状態更新ロジックを以下に変更：

```js
// ドロワーアイテムのアクティブ状態更新（data-section 対応版）
document.querySelectorAll('.drawer-item').forEach((drawerBtn) => {
    const tabMatch = drawerBtn.dataset.tab === tabId;
    const sectionAttr = drawerBtn.dataset.section;

    let isActive;
    if (sectionAttr) {
        // data-section を持つボタンはタブ＋セクション両方一致で active
        isActive = tabMatch && sectionAttr === (currentSectionId || 'about-main');
    } else {
        // data-section を持たないボタんはタブ一致のみで active
        isActive = tabMatch;
    }

    drawerBtn.classList.toggle('active', isActive);
    drawerBtn.setAttribute('aria-selected', isActive ? 'true' : 'false');
});
```

> `currentSectionId` は現在アクティブなサブセクションIDを保持する変数。
> 既存の実装に合わせて読み替えること。

### 3-3. 初期表示時のアクティブ状態

ページ読込時（DOMContentLoaded 付近）でも上記アクティブ状態更新が走るよう確認すること。
初期状態は `about` タブ + `about-main` セクション → ドロワーの「イベント概要」がアクティブ。

---

## 動作確認ポイント

- [ ] スマホ幅でドロワーを開くと「イベント概要」「Q&A」「キャスト」「公式サイト」「お知らせ」が並ぶ
- [ ] 「イベント概要」タップ → aboutタブ＋イベント概要セクションが表示、ドロワーが閉じる
- [ ] 「Q&A」タップ → aboutタブ＋Q&Aセクションが表示、ドロワーが閉じる
- [ ] スマホ幅でaboutタブ内の横タブバーが非表示になっている
- [ ] PC幅（>768px）では横タブバーが引き続き表示される（サイドバーとして）
- [ ] ドロワーのアクティブ表示が「イベント概要」「Q&A」それぞれ正しく反映される
- [ ] キャスト等の他タブを開いた後、ドロワーでイベント概要に戻ると正しくセクションも切り替わる
