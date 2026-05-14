# Phase 2 実装仕様書（Codex CLI用）

## 概要
「イベントについて」タブを3タブに分割する大規模構造変更。  
対象ファイル: `index.html`, `script.js`, `style.css`  
新規画像: `images/group-icon.jpg`

---

## 事前準備：画像コピー

```bash
cp /mnt/e/picture2/mesukemo/1.jpg /mnt/c/Users/yuuya/Desktop/メスケモ推進委員会/images/group-icon.jpg
```

---

## タブ構成の変更

### Before（現在）
| tabId    | ラベル          |
|----------|-----------------|
| `about`  | イベントについて |
| `cast`   | キャスト         |
| `official` | 公式サイト → サイトリンク（Phase1済）|
| `news`   | 🔔 お知らせ      |

### After（Phase 2完了後）
| tabId       | ラベル                   | 左サイドバー |
|-------------|--------------------------|------------|
| `community` | メスケモ推進委員会とは    | なし（1セクション）|
| `events`    | 開催イベント              | あり（左メニュー切り替え）|
| `special`   | 特別開催イベント          | あり（左メニュー切り替え）|
| `cast`      | キャスト                  | あり（既存）|
| `official`  | サイトリンク（Phase1済）  | あり（既存）|
| `news`      | 🔔 お知らせ               | あり（既存）|

---

## タスク 1: script.js の変更

### 1-1. sidebarData の更新（約363〜379行目）

**変更前:**
```js
const sidebarData = {
    about: [
        { id: 'about-main', label: 'イベント概要' },
        { id: 'about-faq', label: 'Q&A' },
    ],
    news: [
        { id: 'news-main', label: 'お知らせ' },
    ],
    cast: [
        { id: 'cast-main', label: 'キャスト一覧' },
    ],
    official: [
        { id: 'official-main', label: '公式リンク' },
    ],
};
```

**変更後:**
```js
const sidebarData = {
    community: [
        { id: 'community-main', label: 'コミュニティ概要' },
    ],
    events: [
        { id: 'events-chaya',    label: 'なでなで茶屋 牝獣' },
        { id: 'events-mesukemo', label: 'なでなで倶楽部 MESUKEMO' },
        { id: 'events-kemono',   label: 'KEMONO写真館' },
        { id: 'events-faq',      label: 'Q&A' },
    ],
    special: [
        { id: 'special-shrine', label: '24時間メスケモ神社' },
    ],
    news: [
        { id: 'news-main', label: 'お知らせ' },
    ],
    cast: [
        { id: 'cast-main', label: 'キャスト一覧' },
    ],
    official: [
        { id: 'official-main', label: '公式リンク' },
    ],
};
```

---

### 1-2. bgImages の更新（約339〜344行目）

**変更前:**
```js
const bgImages = {
    about:    { pc: 'images/bg-about-pc.png',    sp: 'images/bg-about-sp.png'    },
    cast:     { pc: 'images/bg-cast-pc.png',     sp: 'images/bg-cast-sp.png'     },
    official: { pc: 'images/bg-official-pc.png', sp: 'images/bg-official-sp.png' },
    news:     { pc: 'images/bg-about-pc.png',    sp: 'images/bg-about-sp.png'    },
};
```

**変更後:**
```js
const bgImages = {
    community: { pc: 'images/bg-about-pc.png',    sp: 'images/bg-about-sp.png'    },
    events:    { pc: 'images/bg-about-pc.png',    sp: 'images/bg-about-sp.png'    },
    special:   { pc: 'images/bg-about-pc.png',    sp: 'images/bg-about-sp.png'    },
    cast:      { pc: 'images/bg-cast-pc.png',     sp: 'images/bg-cast-sp.png'     },
    official:  { pc: 'images/bg-official-pc.png', sp: 'images/bg-official-sp.png' },
    news:      { pc: 'images/bg-about-pc.png',    sp: 'images/bg-about-sp.png'    },
};
```

---

### 1-3. 名刺ジェネレーターボタン表示条件（約721行目）

**変更前:**
```js
cardGenBtn.classList.toggle('visible', targetId === 'about');
```

**変更後:**
```js
cardGenBtn.classList.toggle('visible', targetId === 'community' || targetId === 'events');
```

---

### 1-4. 桜吹雪の表示条件（約727行目）

**変更前:**
```js
sakura.classList.toggle('active', targetId === 'about' || targetId === 'news');
```

**変更後:**
```js
sakura.classList.toggle('active', targetId === 'community' || targetId === 'events' || targetId === 'special' || targetId === 'news');
```

---

### 1-5. 初期背景・初期タブの更新

#### 初期背景（約1652行目）
**変更前:**
```js
const initBg = bgImages.about[isSPInit ? 'sp' : 'pc'];
```
**変更後:**
```js
const initBg = bgImages.community[isSPInit ? 'sp' : 'pc'];
```

#### ローディング時の画像プリロード（約1337〜1340行目）
**変更前:**
```js
const srcs = isMobile
    ? ['images/bg-about-sp.png', 'images/bg-cast-sp.png', 'images/bg-official-sp.png',
       'images/header-banner.png', 'images/header-logo.png']
    : ['images/bg-about-pc.png', 'images/bg-cast-pc.png', 'images/bg-official-pc.png',
       'images/header-banner.png', 'images/header-logo.png'];
```
**変更後（重複を排除して同じファイルのみプリロード）:**
```js
const srcs = isMobile
    ? ['images/bg-about-sp.png', 'images/bg-cast-sp.png', 'images/bg-official-sp.png',
       'images/header-banner.png', 'images/header-logo.png']
    : ['images/bg-about-pc.png', 'images/bg-cast-pc.png', 'images/bg-official-pc.png',
       'images/header-banner.png', 'images/header-logo.png'];
```
※ community/events/special はすべて bg-about を使いまわすため変更不要。

---

### 1-6. currentSubSections の初期値

`sidebarData` が変更されれば `currentSubSections` は自動的に正しく生成される（Object.fromEntries により）。変更不要。

---

## タスク 2: index.html の変更

### 2-1. スマホドロワーメニューのタブ項目（約54〜78行目）

**変更前:**
```html
<li>
    <button class="drawer-item active" data-tab="about" data-section="about-main" ...>
        イベント概要
    </button>
</li>
<li>
    <button class="drawer-item" data-tab="about" data-section="about-faq" ...>
        Q&A
    </button>
</li>
<li>
    <button class="drawer-item" data-tab="cast" ...>キャスト</button>
</li>
<li>
    <button class="drawer-item" data-tab="official" ...>公式サイト</button>
</li>
<li>
    <button class="drawer-item" data-tab="news" ...>🔔 お知らせ</button>
</li>
```

**変更後:**
```html
<li>
    <button class="drawer-item active" data-tab="community" role="tab" aria-selected="true" aria-controls="community">
        メスケモ推進委員会とは
    </button>
</li>
<li>
    <button class="drawer-item" data-tab="events" role="tab" aria-selected="false" aria-controls="events">
        開催イベント
    </button>
</li>
<li>
    <button class="drawer-item" data-tab="special" role="tab" aria-selected="false" aria-controls="special">
        特別開催イベント
    </button>
</li>
<li>
    <button class="drawer-item" data-tab="cast" role="tab" aria-selected="false" aria-controls="cast">
        キャスト
    </button>
</li>
<li>
    <button class="drawer-item" data-tab="official" role="tab" aria-selected="false" aria-controls="official">
        サイトリンク
    </button>
</li>
<li>
    <button class="drawer-item" data-tab="news" role="tab" aria-selected="false" aria-controls="news">
        🔔 お知らせ
    </button>
</li>
```

---

### 2-2. PCタブナビゲーション（約92〜104行目）

**変更前:**
```html
<button class="tab-button active" data-tab="about" role="tab" aria-selected="true" aria-controls="about">
    イベントについて
</button>
<button class="tab-button" data-tab="cast" ...>キャスト</button>
<button class="tab-button" data-tab="official" ...>公式サイト</button>
<button class="tab-button tab-button--bell" data-tab="news" ...>...</button>
```

**変更後:**
```html
<button class="tab-button active" data-tab="community" role="tab" aria-selected="true" aria-controls="community">
    メスケモ推進委員会とは
</button>
<button class="tab-button" data-tab="events" role="tab" aria-selected="false" aria-controls="events">
    開催イベント
</button>
<button class="tab-button" data-tab="special" role="tab" aria-selected="false" aria-controls="special">
    特別開催イベント
</button>
<button class="tab-button" data-tab="cast" role="tab" aria-selected="false" aria-controls="cast">
    キャスト
</button>
<button class="tab-button" data-tab="official" role="tab" aria-selected="false" aria-controls="official">
    サイトリンク
</button>
<button class="tab-button tab-button--bell" data-tab="news" role="tab" aria-selected="false" aria-controls="news" aria-label="お知らせ">
    <!-- 既存のベルSVGをそのまま維持 -->
    ...（既存のSVGコード）
</button>
```

---

### 2-3. タブコンテンツ: 旧`about`セクションを削除し、3つに置き換える（約119〜310行目）

`<section class="tab-content active" id="about" ...>` 〜 `</section>` の全体を削除し、
以下の3セクションに置き換える。

---

#### ■ community セクション（「メスケモ推進委員会とは」）

```html
<!-- メスケモ推進委員会とは -->
<section class="tab-content active" id="community" role="tabpanel" aria-labelledby="tab-community">
    <div class="section-layout">
        <aside class="section-sidebar" id="sidebar-community" aria-label="メスケモ推進委員会とはのナビゲーション"></aside>
        <div class="section-body">
            <div class="sub-section active" id="community-main">

                <!-- Heroエリア -->
                <div class="community-hero">
                    <p class="community-catch">メスケモ好きなら、今すぐ参加しよう！</p>
                    <img src="images/group-icon.jpg" alt="メスケモ推進委員会 グループアイコン" class="community-icon">
                    <div class="community-hero-links">
                        <a href="https://vrchat.com/home/group/grp_df3c5259-05df-4a28-b5b5-b326c55110fa"
                           target="_blank" rel="noopener noreferrer" class="shop-link">
                            VRChat グループに参加する
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 15L15 5M15 5H8M15 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </a>
                        <a href="https://x.com/mesukemo_ya"
                           target="_blank" rel="noopener noreferrer" class="shop-link">
                            X (Twitter) をフォローする
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 15L15 5M15 5H8M15 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </a>
                    </div>
                </div>

                <!-- グループ説明 -->
                <div class="content-card">
                    <div class="about-group">
                        <h3 class="about-title">About This Group</h3>
                        <p class="about-catch">"メスケモ推進委員会は、メスケモに関わる課題やその解決策について協議し、人間への提言やオスケモとの連携・協働により課題の解決やVRC内でのメスケモの充実を図る非営利団体です"</p>
                        <p class="about-truth">嘘です。</p>
                        <p>「なでなで茶屋 牝獣（メスケモ個室接客イベント）」や「なでなで倶楽部 MESUKEMO（メスケモなでなでマッチングイベント）」など、誰でもメスケモを十分に摂取できるイベントを開催しています。</p>
                        <p class="about-notice">本コミュニティおよび主催イベントは成人向けではありませんが、人によっては刺激的な活動や投稿と感じられる場合があります。加入・参加をもって、これらに対する閲覧の同意とさせていただきます。</p>
                    </div>

                    <!-- ルール -->
                    <div class="about-rule">
                        <h3 class="about-title">ルール</h3>
                        <p>VRChatアカウントがあれば誰でも参加できます。アバターの種類・人間・ケモノ問わず大歓迎です。メスケモアバターでなくても参加できます。</p>
                        <p>メスケモアバターを使用していなくても、メスケモが好きという気持ちがあれば貴方は既にメスケモ推進委員会です。「人間」でも「人外」でも「オスケモ」でもだれでも参加可能！世界をメスケモで満たすために各々の力で邁進していきましょう！</p>
                    </div>

                    <!-- BOOTHショップ -->
                    <div class="about-booth">
                        <h3 class="about-title">BOOTHショップ</h3>
                        <p>メスケモ推進委員会のBOOTHショップでは、オリジナルアバターやギミックを販売しています。</p>
                        <a href="https://mesukemoshop.booth.pm/" target="_blank" rel="noopener noreferrer" class="shop-link">
                            メスケモ無人販売所 (BOOTH) を見る
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 15L15 5M15 5H8M15 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </a>
                    </div>
                </div>

            </div>
        </div>
    </div>
</section>
```

---

#### ■ events セクション（「開催イベント」）

```html
<!-- 開催イベント -->
<section class="tab-content" id="events" role="tabpanel" aria-labelledby="tab-events">
    <div class="section-layout">
        <aside class="section-sidebar" id="sidebar-events" aria-label="開催イベントのナビゲーション"></aside>
        <div class="section-body">

            <!-- なでなで茶屋 牝獣 -->
            <div class="sub-section active" id="events-chaya">
                <div class="content-card">
                    <div class="poster-block">
                        <img src="images/poster-chaya.png" alt="なでなで茶屋 牝獣 ポスター" class="poster-image">
                        <div class="poster-description">
                            <h3 class="poster-title">なでなで茶屋 牝獣</h3>
                            <p class="poster-schedule">毎月第1・第3土曜日 22:55~</p>
                            <p class="poster-schedule-note">※第2・第4土曜日も開催している場合があります</p>
                            <p>1対1の個室でメスケモに思いっきりなでなでされる癒やし体験イベントです。開催中に3回行われる抽選を勝ち抜けばキャストと二人きりで夢のような至福のひとときを過ごせます。たとえ外れても待合ワールドには「メスケモ素手寿司」や「ゲーム」などのアクティビティが満載で、次の抽選を待つ間も賑やかに楽しめます。</p>
                        </div>
                    </div>

                    <!-- 参加方法 -->
                    <div class="guide-section">
                        <h3 class="about-title">参加ステップ</h3>
                        <ol class="guide-steps">
                            <li>
                                <span class="guide-step-num">1</span>
                                <div class="guide-step-body">
                                    <strong>VRChatグループに参加する</strong>
                                    <p>メスケモ推進委員会のVRChatグループに参加すると、イベント開催時に通知が届きます。</p>
                                    <a href="https://vrchat.com/home/group/grp_df3c5259-05df-4a28-b5b5-b326c55110fa" target="_blank" rel="noopener noreferrer" class="shop-link">
                                        グループページを開く
                                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 15L15 5M15 5H8M15 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                    </a>
                                </div>
                            </li>
                            <li>
                                <span class="guide-step-num">2</span>
                                <div class="guide-step-body">
                                    <strong>開催日時に集まる</strong>
                                    <p>毎月第1・第3土曜日 22:55〜 開催です。</p>
                                </div>
                            </li>
                            <li>
                                <span class="guide-step-num">3</span>
                                <div class="guide-step-body">
                                    <strong>抽選に参加する</strong>
                                    <p>待合ワールドで3回行われる抽選に参加します。当選するとキャストと個室でなでなでタイムが始まります。外れても待合ワールドのアクティビティで楽しめます。</p>
                                </div>
                            </li>
                        </ol>
                    </div>

                    <!-- プロモーションビデオ -->
                    <div class="promo-video-section">
                        <h3 class="about-title">プロモーションビデオ</h3>
                        <div class="promo-video-wrapper">
                            <iframe
                                src="https://www.youtube.com/embed/qF4LUtavqlc"
                                title="なでなで茶屋 Promotion Video"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen
                                loading="lazy"
                            ></iframe>
                        </div>
                    </div>

                    <!-- コミック -->
                    <div class="about-manga">
                        <h3 class="about-title">コミック</h3>
                        <p class="manga-description">メスケモ推進委員会の世界観を漫画でご紹介します。</p>
                        <div class="manga-grid">
                            <div class="manga-preview" id="mangaPreview" role="button" tabindex="0" aria-label="漫画を読む（全4ページ）" data-manga-index="0">
                                <img src="images/manga-page1.jpg" alt="漫画1ページ目" class="manga-thumb">
                                <div class="manga-overlay">
                                    <span class="manga-open-btn">漫画を読む</span>
                                    <span class="manga-page-count">全4ページ</span>
                                </div>
                            </div>
                            <div class="manga-preview" role="button" tabindex="0" aria-label="漫画を読む（全1ページ）" data-manga-index="1">
                                <img src="images/manga2-page1.jpg" alt="漫画2 1ページ目" class="manga-thumb">
                                <div class="manga-overlay">
                                    <span class="manga-open-btn">漫画を読む</span>
                                    <span class="manga-page-count">全1ページ</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- なでなで倶楽部 MESUKEMO -->
            <div class="sub-section" id="events-mesukemo">
                <div class="content-card">
                    <div class="poster-block">
                        <img src="images/poster-mesukemo.png" alt="なでなで倶楽部 MESUKEMO ポスター" class="poster-image">
                        <div class="poster-description">
                            <h3 class="poster-title">なでなで倶楽部 MESUKEMO</h3>
                            <p class="poster-schedule">毎週土曜日 22:00~23:00</p>
                            <p>ワールド「なでなでマッチング」に集まった全員で、心ゆくまでなで合うケモノ交流イベントです。個室ではなく開放的な会場で参加者同士が自由に触れ合えるのが最大の特徴。気になるケモノとマッチングして、癒やしの輪を広げましょう。なでるのもなでられるのも自由。みんなで心地よい温もりを共有できる場です。</p>
                        </div>
                    </div>

                    <div class="guide-section">
                        <h3 class="about-title">参加ステップ</h3>
                        <ol class="guide-steps">
                            <li>
                                <span class="guide-step-num">1</span>
                                <div class="guide-step-body">
                                    <strong>VRChatグループに参加する</strong>
                                    <p>メスケモ推進委員会のVRChatグループに参加すると、イベント開催時に通知が届きます。</p>
                                    <a href="https://vrchat.com/home/group/grp_df3c5259-05df-4a28-b5b5-b326c55110fa" target="_blank" rel="noopener noreferrer" class="shop-link">
                                        グループページを開く
                                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 15L15 5M15 5H8M15 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                                    </a>
                                </div>
                            </li>
                            <li>
                                <span class="guide-step-num">2</span>
                                <div class="guide-step-body">
                                    <strong>開催日時に集まる</strong>
                                    <p>毎週土曜日 22:00〜 開催です。</p>
                                </div>
                            </li>
                            <li>
                                <span class="guide-step-num">3</span>
                                <div class="guide-step-body">
                                    <strong>ワールドに参加する</strong>
                                    <p>ワールド「なでなでマッチング」に入場し、参加者と自由になで合う時間です。個室もあるので、恥ずかしい方は個室で楽しむことも可能です。</p>
                                </div>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>

            <!-- KEMONO写真館 -->
            <div class="sub-section" id="events-kemono">
                <div class="content-card">
                    <div class="poster-block">
                        <img src="images/poster-kemono.png" alt="KEMONO写真館 ポスター" class="poster-image">
                        <div class="poster-description">
                            <h3 class="poster-title">KEMONO写真館</h3>
                            <p class="poster-schedule">常時開放中</p>
                            <p>メスケモ推進委員会の写真展示ワールドです。いつでもご利用いただけます。</p>
                            <a href="https://vrch.at/8pefun7w" target="_blank" rel="noopener noreferrer" class="shop-link">
                                ワールドへ行く
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                                    <path d="M5 15L15 5M15 5H8M15 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Q&A -->
            <div class="sub-section" id="events-faq">
                <div class="content-card">
                    <h2>よくある質問</h2>
                    <dl class="faq-list">
                        <div class="faq-item">
                            <dt class="faq-question">メスケモじゃなくても参加できますか？</dt>
                            <dd class="faq-answer">はい、参加できます。人間・人外・オスケモ問わず、どなたでも歓迎です。メスケモが好きという気持ちがあれば十分です。</dd>
                        </div>
                        <div class="faq-item">
                            <dt class="faq-question">初参加でも大丈夫ですか？</dt>
                            <dd class="faq-answer">もちろんです。初めての方でも楽しめるよう設計されています。わからないことがあればキャストや参加者に気軽に声をかけてください。</dd>
                        </div>
                        <div class="faq-item">
                            <dt class="faq-question">どんな服装・アバターで来ればいいですか？</dt>
                            <dd class="faq-answer">特に指定はありません。普段使いのアバターで大丈夫です。ただし、他の参加者への配慮として極端に大きなサイズのアバターはご遠慮ください。</dd>
                        </div>
                        <div class="faq-item">
                            <dt class="faq-question">参加費はかかりますか？</dt>
                            <dd class="faq-answer">無料です。VRChatアカウントがあれば追加費用なく参加できます。</dd>
                        </div>
                        <div class="faq-item">
                            <dt class="faq-question">VRChatのランクに制限はありますか？</dt>
                            <dd class="faq-answer">ランク制限は設けていません。ワールドへの参加に必要な場合はグループへの参加をご確認ください。</dd>
                        </div>
                        <div class="faq-item">
                            <dt class="faq-question">撮影・スクリーンショットは可能ですか？</dt>
                            <dd class="faq-answer">スクリーンショットは相手の許可を得た上でお願いします。動画撮影は禁止です。</dd>
                        </div>
                    </dl>
                </div>
            </div>

        </div>
    </div>
</section>
```

---

#### ■ special セクション（「特別開催イベント」）

```html
<!-- 特別開催イベント -->
<section class="tab-content" id="special" role="tabpanel" aria-labelledby="tab-special">
    <div class="section-layout">
        <aside class="section-sidebar" id="sidebar-special" aria-label="特別開催イベントのナビゲーション"></aside>
        <div class="section-body">

            <!-- 24時間メスケモ神社 -->
            <div class="sub-section active" id="special-shrine">
                <div class="content-card">
                    <h2>24時間メスケモ神社</h2>
                    <p class="poster-schedule">2026年 元旦〜 特別開催</p>
                    <p>お正月に特別開催された24時間ぶっ通しのメスケモイベントです。新年を一緒に祝うべく、たくさんのケモノたちが集まりました。</p>
                    <!-- 画像は後日追加 -->
                    <!-- <img src="images/event-shrine.jpg" alt="24時間メスケモ神社" class="poster-image"> -->
                </div>
            </div>

        </div>
    </div>
</section>
```

---

## タスク 3: style.css の追加スタイル

### Heroエリアのスタイル（既存CSSの末尾に追記）

```css
/* ===== メスケモ推進委員会とは：Heroエリア ===== */
.community-hero {
    text-align: center;
    padding: var(--spacing-xl) var(--spacing-lg);
    margin-bottom: var(--spacing-lg);
}

.community-catch {
    font-size: 1.4rem;
    font-weight: bold;
    color: var(--gold-accent);
    margin-bottom: var(--spacing-lg);
    letter-spacing: 0.05em;
    line-height: 1.6;
}

.community-icon {
    display: block;
    width: min(320px, 80%);
    height: auto;
    margin: 0 auto var(--spacing-lg);
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.community-hero-links {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-md);
    justify-content: center;
}

/* BOOTHセクション */
.about-booth {
    margin-top: var(--spacing-xl);
    padding-top: var(--spacing-lg);
    border-top: 1px solid rgba(212, 175, 55, 0.2);
}

/* スマホ: Heroキャッチコピーフォントサイズ調整 */
@media (max-width: 767px) {
    .community-catch {
        font-size: 1.1rem;
    }
}
```

---

## 配置順序（index.html内のセクション順）

旧 `about` セクション（119〜310行目）を以下の順序で置き換える:
1. `community` セクション（active クラス付き）
2. `events` セクション
3. `special` セクション

その後に続く `news`, `cast`, `official` セクションはそのまま維持する。

---

## 動作確認チェックリスト

- [ ] 画像コピー: `images/group-icon.jpg` が存在するか
- [ ] PCタブに「メスケモ推進委員会とは」「開催イベント」「特別開催イベント」が表示されるか
- [ ] スマホドロワーに同3タブが表示されるか
- [ ] `community` タブでグループアイコン・キャッチコピー・リンクが表示されるか
- [ ] `events` タブで左サイドバー（4項目）が表示されるか
- [ ] 左サイドバーのクリックでコンテンツが切り替わるか
- [ ] `special` タブで「24時間メスケモ神社」が表示されるか
- [ ] 名刺ジェネレーターボタンが `community`・`events` タブで表示されるか
- [ ] 旧 `about` タブが消えているか（URLハッシュ等での残存なし）

---

## 注意事項
- `npm run dev` は既に起動中。重複起動しないこと
- `npm install` も不要
- 修正後は `npm run format` を実行
- `mangaPreview` の `id="mangaPreview"` はJSでリスナーを張るため維持すること
- 漫画ライトボックスのJSロジックは変更不要（要素のIDが保たれていれば動作する）
