# 仕様書：特別開催イベントを開催イベントタブのサイドバーに統合

## 概要

現在「特別開催イベント」は独立したタブとして存在している。
これを「開催イベント」タブ内のサイドバーサブセクションとして統合し、`special` タブを廃止する。

---

## 変更対象ファイル

- `index.html`
- `script.js`

---

## index.html の変更

### 1. ドロワーから特別開催イベントのボタンを削除

以下の `<li>` ブロックを丸ごと削除する。

```html
<li>
    <button class="drawer-item" data-tab="special" role="tab" aria-selected="false" aria-controls="special">
        特別開催イベント
    </button>
</li>
```

### 2. タブバーから特別開催イベントのボタンを削除

以下の `<button>` を丸ごと削除する。

```html
<button class="tab-button" id="tab-special" data-tab="special" role="tab" aria-selected="false" aria-controls="special">
    特別開催イベント
</button>
```

### 3. events セクション内に特別開催イベントのサブセクションを追加

`id="events-faq"` のサブセクション（Q&A）の直前に以下を挿入する。

```html
<!-- 特別開催イベント -->
<div class="sub-section" id="events-special">
    <div class="content-card">
        <h2 class="about-title">特別開催イベント</h2>
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
    </div>
</div>
```

### 4. special セクション全体を削除

以下を丸ごと削除する。

```html
<!-- 特別開催イベント -->
<section class="tab-content" id="special" role="tabpanel" aria-labelledby="tab-special">
    <div class="special-events-grid">
        <!-- 24時間メスケモ神社 -->
        <div class="special-event-card">
            ...
        </div>
        <!-- 今後の特別イベントはここに追加 -->
    </div>
</section>
```

---

## script.js の変更

### 1. sidebarData.events に特別開催イベントを追加

現在の `events` エントリ（365行目付近）を以下に書き換える。
`events-faq` の直前に `events-special` を追加する。

```js
events: [
    { id: 'events-chaya',   label: 'なでなで茶屋 牝獣' },
    { id: 'events-mesukemo', label: 'メスケモ倶楽部' },
    { id: 'events-kemono',  label: 'KEMONO写真館' },
    { id: 'events-special', label: '特別開催イベント' },  // 追加
    { id: 'events-faq',     label: 'Q&A' },
],
```

### 2. sidebarData.special エントリを削除

以下を丸ごと削除する。

```js
special: [
    { id: 'special-shrine', label: '24時間メスケモ神社' },
],
```

### 3. bgMap から special エントリを削除（340行目付近）

以下の行を削除する。

```js
special:   { pc: 'images/bg-about-pc.png',    sp: 'images/bg-about-sp.png'    },
```

### 4. 桜吹雪の表示条件から special を削除（734行目付近）

```js
// 変更前
sakura.classList.toggle('active', targetId === 'community' || targetId === 'events' || targetId === 'special' || targetId === 'news');

// 変更後
sakura.classList.toggle('active', targetId === 'community' || targetId === 'events' || targetId === 'news');
```

---

## 注意事項

- `special-events-grid` / `special-event-card` / `special-event-poster` / `special-event-info` のCSSクラスはstyle.cssに既存のため、変更不要。
- サブセクションのスクロール・サイドバーアクティブ連動はJS側の既存ロジックが自動で対応する。
