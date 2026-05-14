# KEMONO写真館 キャラクターひょっこり 再修正仕様

## 完成イメージ

- 白いカード（`.content-card`）には説明文のみ。キャラは一切含まない。
- カードの下に何もない余白が続く（ここがスクロールエリア）
- スクロールしてセクション最下部まで行くと、カードの外・セクションの縁からキャラが顔を出す
- スクロールバーは全ての端末で常に表示される

---

## 変更内容

### 1. index.html

`#events-kemono` の `.content-card` の**外側・閉じタグの後**にギャラリーセクションを移動する。

**変更前の構造:**
```html
<div class="sub-section" id="events-kemono">
    <div class="content-card">
        <div class="poster-block">...</div>
        <!-- キャストギャラリー（ここにある） -->
        <div class="kemono-gallery-section">
            <div class="kemono-gallery-grid" id="kemonoGallery"></div>
        </div>
    </div>
</div>
```

**変更後の構造:**
```html
<div class="sub-section" id="events-kemono">
    <div class="content-card">
        <div class="poster-block">...</div>
        <!-- ギャラリーセクションはここから削除 -->
    </div>
    <!-- content-cardの外、sub-sectionの直下に移動 -->
    <div class="kemono-gallery-section">
        <div class="kemono-gallery-grid" id="kemonoGallery"></div>
    </div>
</div>
```

### 2. style.css

#### 2-1. `#events-kemono .content-card` の特別スタイルを**削除**する

以下のブロックを丸ごと削除する:
```css
#events-kemono .content-card {
    position: relative;
    min-height: calc(100vh - 160px);
    overflow: hidden;
}
```

#### 2-2. `#events-kemono`（sub-section）に余白とポジション基点を追加

`.sub-section` の後または `#events-kemono` を個別にスタイル追加する:

```css
#events-kemono {
    position: relative;
    /* カード外の余白でスクロールを発生させる + キャラ配置エリア確保 */
    min-height: calc(100vh + 150px);
}
```

#### 2-3. `.kemono-gallery-section` を更新

```css
/* KEMONO写真館 キャラクター下端ひょっこり（カード外） */
.kemono-gallery-section {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 24px;
    pointer-events: none;
}

.kemono-gallery-grid {
    display: flex;
    gap: 24px;
    justify-content: center;
    align-items: flex-end;
}

.kemono-gallery-item {
    flex-shrink: 0;
    width: 110px;
}

.kemono-gallery-item img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    object-position: top center;
    display: block;
}

/* スマホ調整 */
@media (max-width: 767px) {
    .kemono-gallery-item {
        width: 80px;
    }
    .kemono-gallery-item img {
        height: 160px;
    }
    .kemono-gallery-grid {
        gap: 16px;
    }
}
```

### 3. script.js

変更不要。

---

## 注意事項

- `#events-kemono` は `.sub-section` なので `display: none / block` で切り替わるが、`position: relative` と `min-height` はそのまま機能する
- `bottom: 0` はセクション全体（カード＋余白）の最下端を指すので、スクロールしないと見えない
- キャラはカード外の背景（木目や半透明の背景）の上に浮いている形になる
