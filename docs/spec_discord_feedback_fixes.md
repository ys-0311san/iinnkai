# 実装仕様書：Discordフィードバック対応

対象ファイル: `index.html` / `style.css` / `script.js`

---

## 修正1：イントロ画面タイトルの改行制御

**ファイル:** `index.html`

**問題:** `メスケモ推進委員会`（9文字）が極小スマホ（375px以下）で
`メスケモ推進委員\n会` のように不自然な位置で折り返す。

**修正箇所:** `<h1 class="main-title">メスケモ推進委員会</h1>` を以下に変更する。

```html
<h1 class="main-title">メスケモ<wbr>推進委員会</h1>
```

`<wbr>` タグを `メスケモ` と `推進委員会` の間に挿入することで、
改行が必要なときは必ず「メスケモ／推進委員会」の2行で折れるようにする。

---

## 修正2：キャスト名の改行制御（スマホ）

**ファイル:** `style.css`

**問題:** スマホの2列グリッドで、キャスト名が文字の中途半端な位置で折り返す。

**修正箇所:** `.cast-name` の既存スタイルブロック（現在 line 1014 付近）に以下を追加する。

```css
.cast-name {
    /* 既存スタイルはそのまま維持 */
    word-break: keep-all;       /* 単語単位で折り返す（日本語の自然な区切りを尊重） */
    overflow-wrap: anywhere;    /* カード幅を超える場合は任意位置で折り返す（あふれ防止） */
}
```

スマホ用メディアクエリ内（`@media (max-width: 768px)` 内）の `.cast-name` にも同じ2行を追加すること。

---

## 修正3：さまあさん（size: small）の表示位置補正

**問題:** キャストデータに `size: 'small'` / `'medium'` / `'large'` が定義されているが、
`renderCastGrid` 内でまったく使われていないため、小さなキャラクターが画像内で
上に浮いて見える（`object-position: center bottom` により下に余白がある画像で顕著）。

### script.js の修正

`renderCastGrid` 関数内で `imageWrapper` を生成している箇所（現在 line 836 付近）の直後、
`imageWrapper.className = 'cast-image-wrapper lazy-wrapper';` の次の行に以下を追加する。

```js
// sizeプロパティを data属性としてセットし、CSSで object-position を制御する
if (cast.size) {
    imageWrapper.dataset.size = cast.size;
}
```

### style.css の修正

`.cast-image` の既存スタイルブロック（現在 line 1000 付近）の直後に以下を追加する。

```css
/* sizeがsmallのキャストは object-position を center center に変更して上浮きを補正 */
.cast-image-wrapper[data-size="small"] .cast-image {
    object-position: center center;
}

/* sizeがlargeのキャストはキャラが大きいため bottom 寄りを維持（明示） */
.cast-image-wrapper[data-size="large"] .cast-image {
    object-position: center bottom;
}
```

---

## 修正4：プロモーション動画の追加

**ファイル:** `index.html`

**概要:** タカニソさんが作成した「なでなで茶屋 Promotion Video」を about セクションのイベントポスター直下に埋め込む。

YouTube動画ID: `qF4LUtavqlc`（URL: `https://youtu.be/qF4LUtavqlc`）

**挿入箇所:** `<!-- ルール -->` コメント（現在 line 216 付近）の直前、
つまり `</div><!-- .event-posters 閉じ -->` の直後に以下を挿入する。

```html
<!-- プロモーション動画 -->
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
```

**style.css に追加するスタイル（`.event-posters` スタイルの近くに追加）:**

```css
/* プロモーション動画セクション */
.promo-video-section {
    margin-top: var(--spacing-xl);
}

/* 16:9アスペクト比を保ちながらレスポンシブにする */
.promo-video-wrapper {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    margin-top: var(--spacing-md);
}

.promo-video-wrapper iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
}
```

---

## 実装後の確認事項

- [ ] スマホ（375px）でイントロタイトルが「メスケモ／推進委員会」2行で折れること
- [ ] スマホでキャスト名が不自然な位置で折り返さないこと
- [ ] さまあさん（id:2）の木札カードでキャラクターが上に浮いて見えないこと
- [ ] YouTubeプレーヤーがPCおよびスマホで正しい16:9比率で表示されること
- [ ] 既存の他セクション（キャスト詳細・お知らせ等）に影響がないこと
