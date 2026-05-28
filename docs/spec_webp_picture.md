# spec: index.html 画像WebP対応（picture要素化 + WebP直指定）

## 対象ファイル
- `index.html`

## 背景
WebPファイルが全画像分生成済み。index.html の画像タグをWebP対応に変更する。

---

## 変更1: 主要画像を `<picture>` 要素に変換

以下の `<img>` を `<picture>` 要素でラップし、WebP→PNG/JPG のフォールバック構成にする。

### header-banner

**変更前:**
```html
<img src="images/header-banner.png" alt="メスケモ推進委員会" class="header-banner">
```

**変更後:**
```html
<picture>
  <source type="image/webp" srcset="images/header-banner.webp">
  <img src="images/header-banner.png" alt="メスケモ推進委員会" class="header-banner">
</picture>
```

---

### header-logo

**変更前:**
```html
<img src="images/header-logo.png" alt="なでなで茶屋 ロゴ" class="header-logo">
```

**変更後:**
```html
<picture>
  <source type="image/webp" srcset="images/header-logo.webp">
  <img src="images/header-logo.png" alt="なでなで茶屋 ロゴ" class="header-logo">
</picture>
```

---

### group-icon

**変更前:**
```html
<img src="images/group-icon.jpg" alt="メスケモ推進委員会 グループアイコン" class="community-icon">
```

**変更後:**
```html
<picture>
  <source type="image/webp" srcset="images/group-icon.webp">
  <img src="images/group-icon.jpg" alt="メスケモ推進委員会 グループアイコン" class="community-icon">
</picture>
```

---

### poster-chaya

**変更前:**
```html
<img src="images/poster-chaya.png" alt="なでなで茶屋 牝獣 ポスター" class="poster-image" loading="lazy" decoding="async">
```

**変更後:**
```html
<picture>
  <source type="image/webp" srcset="images/poster-chaya.webp">
  <img src="images/poster-chaya.png" alt="なでなで茶屋 牝獣 ポスター" class="poster-image" loading="lazy" decoding="async">
</picture>
```

---

### poster-mesukemo

**変更前:**
```html
<img src="images/poster-mesukemo.png" alt="なでなで倶楽部 MESUKEMO ポスター" class="poster-image" loading="lazy" decoding="async">
```

**変更後:**
```html
<picture>
  <source type="image/webp" srcset="images/poster-mesukemo.webp">
  <img src="images/poster-mesukemo.png" alt="なでなで倶楽部 MESUKEMO ポスター" class="poster-image" loading="lazy" decoding="async">
</picture>
```

---

### poster-kemono

**変更前:**
```html
<img src="images/poster-kemono.png" alt="KEMONO写真館 ポスター" class="poster-image" loading="lazy" decoding="async">
```

**変更後:**
```html
<picture>
  <source type="image/webp" srcset="images/poster-kemono.webp">
  <img src="images/poster-kemono.png" alt="KEMONO写真館 ポスター" class="poster-image" loading="lazy" decoding="async">
</picture>
```

---

### poster-shrine

**変更前:**
```html
<img src="images/poster-shrine.jpg" alt="24時間メスケモ神社 ポスター" class="special-event-poster" loading="lazy" decoding="async">
```

**変更後:**
```html
<picture>
  <source type="image/webp" srcset="images/poster-shrine.webp">
  <img src="images/poster-shrine.jpg" alt="24時間メスケモ神社 ポスター" class="special-event-poster" loading="lazy" decoding="async">
</picture>
```

---

## 変更2: 小画像のsrcをWebPに直接変更

以下の画像はWebPファイルが存在するため、`src` をWebPに直接変更する（フォールバック不要）。

### 漫画サムネ1

**変更前:**
```html
<img src="images/manga-page1.jpg" alt="漫画1ページ目" class="manga-thumb" loading="lazy" decoding="async">
```

**変更後:**
```html
<img src="images/manga-page1.webp" alt="漫画1ページ目" class="manga-thumb" loading="lazy" decoding="async">
```

---

### 漫画サムネ2

**変更前:**
```html
<img src="images/manga2-page1.jpg" alt="漫画2 1ページ目" class="manga-thumb" loading="lazy" decoding="async">
```

**変更後:**
```html
<img src="images/manga2-page1.webp" alt="漫画2 1ページ目" class="manga-thumb" loading="lazy" decoding="async">
```

---

### icon-x

**変更前:**
```html
<img src="images/icon-x.jpg" alt="X アイコン" class="official-icon" loading="lazy" decoding="async">
```

**変更後:**
```html
<img src="images/icon-x.webp" alt="X アイコン" class="official-icon" loading="lazy" decoding="async">
```

---

### icon-booth

**変更前:**
```html
<img src="images/icon-booth.png" alt="BOOTH アイコン" class="official-icon official-icon--booth" loading="lazy" decoding="async">
```

**変更後:**
```html
<img src="images/icon-booth.webp" alt="BOOTH アイコン" class="official-icon official-icon--booth" loading="lazy" decoding="async">
```

---

## 注意事項

- `ogp-main.png` は変更しない（SNSクローラー互換のためPNG維持）
- `<picture>` のネスト構造に注意。既存の `class` や `loading` 属性は `<img>` タグに残す
- `<source>` には `srcset` のみを指定（`src` は指定しない）
