# 仕様書：スマホレスポンシブ一括修正

## 変更対象ファイル

- `style.css`

---

## 修正内容

### 1. BGMプレイヤーと名刺ジェネレーターボタンの重なり解消

スマホで `.bgm-player`（bottom: 72px, right: 14px）と `.card-gen-btn`（画面下部固定）が重なる。
BGMプレイヤーを名刺ジェネレーターボタンの上に出るよう調整する。

`@media (max-width: 767px)` 内の `.bgm-player` を以下に変更：

```css
.bgm-player {
    bottom: 130px;
    right: 14px;
}
```

---

### 2. 極小画面（375px以下）でキャストグリッドを1列に

現在 `@media (max-width: 767px)` で2列（`repeat(2, 1fr)`）になっている。
375px以下では1列にする。

`@media (max-width: 375px)` ブロックに以下を追加（なければ新規作成）：

```css
@media (max-width: 375px) {
    .cast-grid {
        grid-template-columns: 1fr;
    }
}
```

---

### 3. community-hero-caption のスマホpadding縮小

`@media (max-width: 767px)` 内、または `.community-hero-caption` のスマホ向けスタイルで padding を縮小する。

```css
@media (max-width: 767px) {
    .community-hero-caption {
        padding: var(--spacing-sm) var(--spacing-md);
    }
}
```

---

### 4. キャスト詳細オーバーレイのスマホ幅修正

`.cast-detail-info` のスマホ向け `max-width` を画面幅に追従させる。

`@media (max-width: 767px)` 内の `.cast-detail-info` を以下に変更：

```css
.cast-detail-info {
    max-width: 100%;
    width: 100%;
}
```

---

### 5. 左右余白の統一

`@media (max-width: 767px)` 内で `.main-content` と `.header-inner` の左右paddingを `var(--spacing-sm)` に統一する。

```css
@media (max-width: 767px) {
    .main-content {
        padding-left: var(--spacing-sm);
        padding-right: var(--spacing-sm);
    }
}
```

---

### 6. community-hero-links のスマホ幅対応

スマホでボタンが横に並んで窮屈にならないよう、`flex-direction: column` に変更する。

```css
@media (max-width: 767px) {
    .community-hero-links {
        flex-direction: column;
        align-items: stretch;
        gap: var(--spacing-sm);
    }

    .community-hero-links .shop-link {
        justify-content: center;
        text-align: center;
    }
}
```

---

### 7. poster-block のスマホ縦並び確認・修正

`.poster-block` がスマホで横並びのままになっている場合、縦並びにする。

```css
@media (max-width: 767px) {
    .poster-block {
        flex-direction: column;
        align-items: center;
    }

    .poster-image {
        max-width: 100%;
        width: 100%;
        max-height: none;
    }
}
```

---

## 注意事項

- 既存のメディアクエリが複数箇所に分散しているため、重複しないよう既存の `@media (max-width: 767px)` ブロック内に追記する形を優先すること
- 新規の `@media (max-width: 375px)` ブロックはファイル末尾に追加する
- CSSカスタムプロパティ（`var(--spacing-*)`）を必ず使用し、px直打ちは避ける
