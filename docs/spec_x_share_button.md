# 仕様書：カードジェネレーター Xシェアボタン実装

## 概要

`secret-card.html` の「カードをダウンロード」ボタンの直下に「Xでポスト」ボタンを追加する。
クリックすると `twitter.com/intent/tweet` を新しいタブで開き、テキスト+URL+ハッシュタグを投稿させる。
画像は直接添付しない（ユーザーがダウンロードして自分で添付してもらう）。

---

## 変更対象ファイル

1. `secret-card.html`
2. `card-generator.js`
3. `card-style.css`

---

## 1. `secret-card.html` の変更

### 変更箇所

`#downloadSection` 内の `btn-download` ボタンの直下、`btn-secondary` の上に以下を挿入する。

```html
<!-- Xシェアボタン（generateCard()実行後にJS側でhrefを設定して表示） -->
<a id="shareXBtn"
   href="#"
   target="_blank"
   rel="noopener noreferrer"
   class="btn-share-x btn-share-x--full"
   style="display:none;"
   aria-label="Xでカードをポストする">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
    Xでポスト
</a>
```

**挿入位置イメージ（変更前→変更後）:**

```html
<!-- 変更前 -->
<div class="download-section" id="downloadSection" style="display: none;">
    <button type="button" class="btn-download" id="downloadBtn">
        カードをダウンロード
    </button>
    <button type="button" class="btn-secondary" id="resetFormBtn">
        もう一度作成
    </button>
</div>

<!-- 変更後 -->
<div class="download-section" id="downloadSection" style="display: none;">
    <button type="button" class="btn-download" id="downloadBtn">
        カードをダウンロード
    </button>
    <a id="shareXBtn"
       href="#"
       target="_blank"
       rel="noopener noreferrer"
       class="btn-share-x btn-share-x--full"
       style="display:none;"
       aria-label="Xでカードをポストする">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        Xでポスト
    </a>
    <!-- Xシェアボタンと同じタイミングで表示するヘルプテキスト -->
    <p id="shareXHint" class="share-x-hint" style="display:none;">
        よかったら画像もダウンロードして添付してね！
    </p>
    <button type="button" class="btn-secondary" id="resetFormBtn">
        もう一度作成
    </button>
</div>
```

---

## 2. `card-generator.js` の変更

### 2-1. `generateCard()` 関数に処理を追記

`generateCard()` の末尾（`alert(...)` の直前）に以下を追加する。

```js
// Xシェアボタンのhref動的生成と表示
updateShareXBtn();
```

### 2-2. `updateShareXBtn()` 関数を新規追加

`generateCard()` 関数の直後に追加する。

```js
/* ===========================
   Xシェアボタンのhrefを動的生成して表示する
   称号（userTitle）を含めたツイートテキストを構築する
   =========================== */
function updateShareXBtn() {
    const shareBtn = document.getElementById('shareXBtn');
    if (!shareBtn) return;

    const userTitle = document.getElementById('userTitle').value.trim();

    // ツイートテキスト（称号がある場合は「〇〇として認定」を追加）
    const tweetText = userTitle
        ? `メスケモ推進委員会の会員カードを作りました！\n「${userTitle}」として認定されました🐾`
        : 'メスケモ推進委員会の会員カードを作りました！🐾';

    const params = new URLSearchParams({
        text:     tweetText,
        url:      'https://mesukemo.uk/',
        hashtags: 'メスケモ推進委員会,VRChat',
    });

    shareBtn.href = `https://twitter.com/intent/tweet?${params.toString()}`;
    shareBtn.style.display = 'inline-flex';

    // ヘルプテキストも一緒に表示する
    const shareHint = document.getElementById('shareXHint');
    if (shareHint) shareHint.style.display = 'block';
}
```

### 2-3. `resetForm()` 関数にボタン非表示を追記

`resetForm()` 内の末尾（`drawPreviewCard()` の直前）に以下を追加する。

```js
// Xシェアボタンとヘルプテキストを非表示に戻す
const shareBtn = document.getElementById('shareXBtn');
if (shareBtn) shareBtn.style.display = 'none';
const shareHint = document.getElementById('shareXHint');
if (shareHint) shareHint.style.display = 'none';
```

### 2-4. `setupEventListeners()` は変更不要

`shareXBtn` は `<a>` タグ（リンク）なので、クリックイベント登録は不要。

---

## 3. `card-style.css` の変更

`.btn-share-x--full` 修飾クラスを追加して、ダウンロードセクション内では横幅100%・中央寄せになるようにする。

### 追加場所

`.btn-share-x:active { ... }` ブロックの直後に追加する。

```css
/* ダウンロードセクション内でXシェアボタンを横幅100%にする修飾クラス */
.btn-share-x--full {
    width: 100%;
    justify-content: center;
    border-radius: 6px;
    margin-bottom: 0.35rem;
}

/* Xシェアボタン下のヘルプテキスト */
.share-x-hint {
    font-size: 0.75rem;
    color: rgba(245, 243, 237, 0.68);
    text-align: center;
    margin: 0 0 var(--spacing-sm);
}
```

---

## 動作確認チェックリスト

- [ ] カード生成前：Xシェアボタンが非表示になっている
- [ ] 「カードを生成」ボタン押下後：Xシェアボタンが表示される
- [ ] Xシェアボタンのhrefにユーザー名・テキスト・URL・ハッシュタグが正しく含まれている
- [ ] クリックすると新しいタブで `twitter.com/intent/tweet` が開く
- [ ] 「もう一度作成」ボタン押下後：Xシェアボタンが非表示に戻る
- [ ] モバイル表示でもボタンが横幅100%で表示される
