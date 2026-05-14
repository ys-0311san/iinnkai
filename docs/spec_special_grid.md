# 特別開催イベント 2カラムグリッド実装仕様

## 概要

特別開催イベントセクションをサイドバー＋1件表示から、全件を2カラムグリッドで一覧表示する形に変更する。
ポスター画像 + イベント情報のカード形式で並べる。

---

## 1. index.html の変更

`#special` セクション内を以下に**丸ごと置き換える**。

**変更前:**
```html
<section class="tab-content" id="special" role="tabpanel" aria-labelledby="tab-special">
    <div class="section-layout">
        <aside class="section-sidebar" id="sidebar-special" aria-label="特別開催イベントのナビゲーション"></aside>
        <div class="section-body">
            <div class="sub-section active" id="special-shrine">
                <div class="content-card">
                    <h2>24時間メスケモ神社</h2>
                    <p class="poster-schedule">2026年 元旦〜 特別開催</p>
                    <p>お正月に特別開催された24時間ぶっ通しのメスケモイベントです。新年を一緒に祝うべく、たくさんのケモノたちが集まりました。</p>
                </div>
            </div>
        </div>
    </div>
</section>
```

**変更後:**
```html
<section class="tab-content" id="special" role="tabpanel" aria-labelledby="tab-special">
    <div class="special-events-grid">

        <!-- 24時間メスケモ神社 -->
        <div class="special-event-card">
            <img src="images/poster-shrine.jpg" alt="24時間メスケモ神社 ポスター" class="special-event-poster">
            <div class="special-event-info">
                <h3 class="poster-title">24時間メスケモ神社</h3>
                <p class="poster-schedule">2026年1月3日 特別開催</p>
                <p>お正月に特別開催された24時間ぶっ通しのメスケモイベントです。24時間ケモ巫女常駐・お焚き上げおみくじ・ふるまい甘酒など、新年を一緒に祝うべく、たくさんのケモノたちが集まりました。</p>
            </div>
        </div>

        <!-- 今後の特別イベントはここに追加 -->

    </div>
</section>
```

---

## 2. style.css の変更

既存スタイルの末尾（または適切な位置）に以下を**追加**する。

```css
/* ===== 特別開催イベント グリッドレイアウト ===== */
.special-events-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--spacing-xl);
    padding: var(--spacing-md);
}

.special-event-card {
    background: rgba(245, 243, 237, 0.6);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 8px 32px var(--shadow);
    display: flex;
    flex-direction: column;
}

.special-event-poster {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    object-position: center top;
    display: block;
}

.special-event-info {
    padding: var(--spacing-md);
    flex: 1;
}

/* スマホ: 1列 */
@media (max-width: 767px) {
    .special-events-grid {
        grid-template-columns: 1fr;
        padding: var(--spacing-sm);
    }
}
```

---

## 3. script.js の変更

`sidebarData.special` は使われなくなるが、JSエラーを防ぐためそのまま残す。
`bgImages.special` の背景設定もそのまま維持する。

---

## 注意事項

- `.section-layout` / `.section-sidebar` / `.sub-section` は `#special` では不要になる
- 画像パスは `images/poster-shrine.jpg`（コピー済み）
- 今後イベントが増えたら `.special-event-card` ブロックを追加するだけ
