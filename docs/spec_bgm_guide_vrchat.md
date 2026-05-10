# 実装仕様書：BGMプレイヤー・参加ガイド/FAQ・VRChatグループリンク

## 概要

以下の3機能を追加する。

1. **BGMフローティングプレイヤー** — 3曲切り替え + OFF ボタン
2. **参加ガイド / FAQ** — aboutタブのサブセクションとして静的追加
3. **VRChatグループリンク** — officialタブのリンク一覧に追加

---

## 事前準備：音源ファイルのダウンロード

以下のコマンドを実行して、音源を `audio/` フォルダに配置する。  
（甘茶の音楽工房は直リンク禁止のためローカルホスト必須）

```bash
mkdir -p audio
curl -o audio/bgm1_yuruyakanakaze.mp3 "https://amachamusic.chagasi.com/mp3/yuruyakanakaze.mp3"
curl -o audio/bgm2_ouun.mp3 "https://amachamusic.chagasi.com/mp3/ouun.mp3"
curl -o audio/bgm3_heiannoyoi.mp3 "https://amachamusic.chagasi.com/mp3/heiannoyoi.mp3"
```

---

## 1. BGMフローティングプレイヤー

### 使用楽曲（甘茶の音楽工房 / 商用利用可・著作権フリー）

| No | ファイル名 | 曲名 | 雰囲気 |
|----|-----------|------|--------|
| 1  | `audio/bgm1_yuruyakanakaze.mp3` | 緩やかな風 | 癒し・二胡・和打楽器 |
| 2  | `audio/bgm2_ouun.mp3`           | 桜雲       | しみじみ・胡弓・ハープ |
| 3  | `audio/bgm3_heiannoyoi.mp3`     | 平安ノ宵   | 和風・尺八・三味線・琴 |

クレジット（推奨）: 甘茶の音楽工房 https://amachamusic.chagasi.com/

### UI仕様

**配置**: 画面右下、固定（`position: fixed; bottom: 20px; right: 20px`）  
**z-index**: `9000`（名刺ジェネレーターボタンと同等レベル、重ならないよう注意）  
**SP対応**: スマホでも右下に表示。名刺ジェネレーターボタン（左下）と干渉しない

#### HTML構造（`index.html` の `</body>` 直前に追加）

```html
<!-- BGMフローティングプレイヤー -->
<div class="bgm-player" id="bgmPlayer" aria-label="BGMプレイヤー">
  <div class="bgm-track-buttons">
    <button class="bgm-track-btn" data-track="0" aria-label="緩やかな風を再生">風</button>
    <button class="bgm-track-btn" data-track="1" aria-label="桜雲を再生">桜</button>
    <button class="bgm-track-btn" data-track="2" aria-label="平安ノ宵を再生">宵</button>
  </div>
  <button class="bgm-off-btn" id="bgmOffBtn" aria-label="BGMを停止">OFF</button>
</div>
```

#### 動作仕様

- **初期状態**: 停止（自動再生なし）。全ボタン非アクティブ
- **曲ボタンクリック**: 対応する曲をループ再生。アクティブ状態（`.active`）を付与。OFF状態から押しても再生開始
- **別の曲ボタンクリック**: 現在再生中の曲を止め、新しい曲を先頭から再生
- **OFFボタンクリック**: 再生を停止。全ボタンのアクティブ状態を解除
- **ループ**: `audio.loop = true` でエンドレスループ
- **音量**: `audio.volume = 0.4`（デフォルト）

#### CSS仕様（`style.css` に追加）

```css
/* BGMプレイヤー */
.bgm-player {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9000;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(20, 15, 10, 0.85);
  border: 1px solid rgba(180, 130, 80, 0.5);
  border-radius: 30px;
  padding: 6px 10px;
  backdrop-filter: blur(8px);
}

.bgm-track-buttons {
  display: flex;
  gap: 4px;
}

.bgm-track-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(180, 130, 80, 0.4);
  background: transparent;
  color: rgba(200, 170, 120, 0.8);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.bgm-track-btn:hover {
  background: rgba(180, 130, 80, 0.2);
  color: #d4a96a;
}

.bgm-track-btn.active {
  background: rgba(180, 130, 80, 0.35);
  color: #f0c070;
  border-color: rgba(180, 130, 80, 0.8);
}

.bgm-off-btn {
  height: 32px;
  padding: 0 10px;
  border-radius: 16px;
  border: 1px solid rgba(180, 130, 80, 0.4);
  background: transparent;
  color: rgba(200, 170, 120, 0.7);
  font-size: 11px;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s;
}

.bgm-off-btn:hover {
  background: rgba(180, 130, 80, 0.15);
  color: #d4a96a;
}

/* SP対応 */
@media (max-width: 768px) {
  .bgm-player {
    bottom: 14px;
    right: 14px;
    padding: 5px 8px;
    gap: 4px;
  }

  .bgm-track-btn {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }

  .bgm-off-btn {
    height: 28px;
    padding: 0 8px;
    font-size: 10px;
  }
}
```

#### JavaScript実装（`script.js` に追加）

BGMプレイヤーのセクションをモジュールとして `script.js` に追加。  
DOMContentLoaded 内の末尾で `setupBgmPlayer()` を呼び出す。

```javascript
/* ===========================
   BGMプレイヤー
   =========================== */
const bgmTracks = [
  { src: 'audio/bgm1_yuruyakanakaze.mp3', label: '緩やかな風' },
  { src: 'audio/bgm2_ouun.mp3',           label: '桜雲' },
  { src: 'audio/bgm3_heiannoyoi.mp3',     label: '平安ノ宵' },
];

let bgmAudio = null;      // 現在のAudioインスタンス
let bgmCurrentIdx = -1;   // 現在再生中のインデックス（-1=停止中）

function setupBgmPlayer() {
  const trackBtns = document.querySelectorAll('.bgm-track-btn');
  const offBtn    = document.getElementById('bgmOffBtn');

  trackBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.track, 10);
      playBgmTrack(idx, trackBtns);
    });
  });

  offBtn.addEventListener('click', () => {
    stopBgm(trackBtns);
  });
}

// 曲を再生（同じ曲を押した場合も先頭から再生）
function playBgmTrack(idx, trackBtns) {
  // 既存の再生を停止
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
  }

  // 新しいAudioを作成して再生
  bgmAudio = new Audio(bgmTracks[idx].src);
  bgmAudio.loop   = true;
  bgmAudio.volume = 0.4;
  bgmAudio.play().catch(() => {
    // ブラウザのAutoplay Policyでブロックされた場合は無視
  });
  bgmCurrentIdx = idx;

  // ボタンのアクティブ状態を更新
  trackBtns.forEach((b, i) => {
    b.classList.toggle('active', i === idx);
  });
}

// 停止
function stopBgm(trackBtns) {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
    bgmAudio = null;
  }
  bgmCurrentIdx = -1;
  trackBtns.forEach((b) => b.classList.remove('active'));
}
```

---

## 2. 参加ガイド / FAQ（aboutタブのサブセクション）

### script.js の変更

`sidebarData.about` の配列に2項目を追加する。

```javascript
// 変更前
about: [
    { id: 'about-main', label: 'イベントについて' },
],

// 変更後
about: [
    { id: 'about-main',  label: 'イベントについて' },
    { id: 'about-guide', label: '参加ガイド' },
    { id: 'about-faq',   label: 'FAQ' },
],
```

### index.html の変更

`id="about"` セクション内、既存の `about-main` サブセクションの直後に以下を追加。

```html
<!-- サブセクション: 参加ガイド -->
<div class="sub-section" id="about-guide">
  <div class="content-card">
    <h2>参加ガイド</h2>

    <div class="guide-section">
      <h3 class="about-title">イベントへの参加ステップ</h3>
      <ol class="guide-steps">
        <li>
          <span class="guide-step-num">01</span>
          <div class="guide-step-body">
            <strong>VRChatグループに参加する</strong>
            <p>メスケモ推進委員会のVRChatグループに参加すると、イベント開催時に通知が届きます。</p>
            <a href="https://vrchat.com/home/group/grp_df3c5259-05df-4a28-b5b5-b326c55110fa"
               target="_blank" rel="noopener noreferrer" class="shop-link">
              グループページを開く
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M5 15L15 5M15 5H8M15 5V12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
        </li>
        <li>
          <span class="guide-step-num">02</span>
          <div class="guide-step-body">
            <strong>開催日時に集まる</strong>
            <p>「なでなで茶屋 牝獣」は毎月第1・第3土曜日 22:55〜、「なでなで倶楽部 MESUKEMO」は毎週土曜日 22:00〜 開催です。</p>
          </div>
        </li>
        <li>
          <span class="guide-step-num">03</span>
          <div class="guide-step-body">
            <strong>抽選に参加する（なでなで茶屋 牝獣）</strong>
            <p>待合ワールドで3回行われる抽選に参加します。当選するとキャストと個室でなでなでタイムが始まります。外れても待合ワールドのアクティビティで楽しめます。</p>
          </div>
        </li>
        <li>
          <span class="guide-step-num">04</span>
          <div class="guide-step-body">
            <strong>自由に交流する（なでなで倶楽部 MESUKEMO）</strong>
            <p>ワールド「なでなでマッチング」に入場し、参加者と自由になで合う時間です。個室もあるので、恥ずかしい方は個室で楽しむことも可能です。</p>
          </div>
        </li>
      </ol>
    </div>

    <div class="guide-section">
      <h3 class="about-title">参加条件</h3>
      <p>VRChatアカウントがあれば誰でも参加できます。アバターの種類・人間・ケモノ問わず大歓迎です。メスケモアバターでなくても参加できます。</p>
    </div>
  </div>
</div>

<!-- サブセクション: FAQ -->
<div class="sub-section" id="about-faq">
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
        <dd class="faq-answer">特定のランク制限は設けていませんが、Friendsランク以上を推奨しています。ワールドへの参加に必要な場合はグループへの参加をご確認ください。</dd>
      </div>

      <div class="faq-item">
        <dt class="faq-question">撮影・スクリーンショットは可能ですか？</dt>
        <dd class="faq-answer">相手の許可を得た上でお願いします。キャストへの撮影依頼はイベント中に直接声をかけてください。</dd>
      </div>

    </dl>
  </div>
</div>
```

### style.css に追加（参加ガイド・FAQ）

```css
/* 参加ガイド ステップ */
.guide-section {
  margin-bottom: 2rem;
}

.guide-steps {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.guide-steps li {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.guide-step-num {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(180, 130, 80, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: rgba(180, 130, 80, 0.9);
  letter-spacing: 0.05em;
  margin-top: 2px;
}

.guide-step-body strong {
  display: block;
  margin-bottom: 0.3rem;
  color: #e8d5b0;
}

.guide-step-body p {
  margin: 0 0 0.5rem;
  font-size: 0.9em;
  color: rgba(220, 200, 170, 0.85);
}

/* FAQ */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
}

.faq-item {
  border-bottom: 1px solid rgba(180, 130, 80, 0.2);
  padding: 1rem 0;
}

.faq-item:last-child {
  border-bottom: none;
}

.faq-question {
  font-weight: bold;
  color: #e8d5b0;
  margin-bottom: 0.5rem;
  padding-left: 1.2em;
  position: relative;
}

.faq-question::before {
  content: 'Q.';
  position: absolute;
  left: 0;
  color: rgba(180, 130, 80, 0.8);
  font-size: 0.9em;
}

.faq-answer {
  margin: 0;
  padding-left: 1.2em;
  position: relative;
  color: rgba(220, 200, 170, 0.85);
  font-size: 0.9em;
  line-height: 1.6;
}

.faq-answer::before {
  content: 'A.';
  position: absolute;
  left: 0;
  color: rgba(180, 130, 80, 0.6);
  font-size: 0.9em;
}
```

---

## 3. VRChatグループリンク（officialタブ）

### index.html の変更

`id="official"` セクション内、`official-links` の先頭に以下を追加。

```html
<!-- VRChatグループ（アイコンなし・テキストのみ） -->
<a href="https://vrchat.com/home/group/grp_df3c5259-05df-4a28-b5b5-b326c55110fa"
   class="official-link official-link--no-icon" target="_blank" rel="noopener noreferrer">
  <span>VRChat グループ</span>
</a>
```

アイコンなしの場合、`official-link--no-icon` に以下のCSSを追加:

```css
.official-link--no-icon {
  padding-left: 1rem;
}
```

### VRChatアイコン画像について

アイコン画像は使用しない。`img` タグは不要。テキストのみで表示する。

---

## DOMContentLoaded への追記

`script.js` の `DOMContentLoaded` ハンドラ末尾に追加:

```javascript
// BGMプレイヤーを初期化
setupBgmPlayer();
```

---

## クレジット表記（推奨）

index.html のフッター相当の位置（または非表示コメントとして）以下を追記:

```
BGM: 甘茶の音楽工房 (https://amachamusic.chagasi.com/)
```

---

## チェックリスト

- [ ] `audio/` フォルダを作成し3曲のmp3をダウンロード済み
- [ ] `images/icon-vrchat.png` を配置済み
- [ ] BGMプレイヤーHTML追加
- [ ] BGMプレイヤーCSS追加
- [ ] BGMプレイヤーJS追加（setupBgmPlayer関数 + DOMContentLoadedで呼び出し）
- [ ] sidebarData.about に `about-guide` と `about-faq` を追加
- [ ] aboutタブに参加ガイドHTMLサブセクション追加
- [ ] aboutタブにFAQ HTMLサブセクション追加
- [ ] 参加ガイド・FAQのCSS追加
- [ ] officialタブにVRChatグループリンク追加
- [ ] `npm run format` でコードスタイルを統一
