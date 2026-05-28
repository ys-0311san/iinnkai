# 仕様書：lottery.html リニューアル（ランダム番号抽選ページ）

## 概要

`lottery.html` を「ランダム抽選番号を引いてXに投稿する」ページに全面リニューアルする。
URLトークン認証・Googleフォームは廃止。誰でもURLから直接アクセス可能。

---

## 変更対象ファイル

- `lottery.html`（全面書き換え）

---

## 機能仕様

### 番号生成

- 生成範囲：1〜9999
- 表示形式：必ず4桁ゼロパディング（例：`0111`、`0042`、`3821`）
- ページ読み込み時に自動で1回生成する
- 「引き直す」ボタンで再生成可能（引き直し回数制限なし）

### Xシェアボタン

Twitter Intent URL を使ってX投稿ダイアログを開く。

投稿テキスト：
```
私の抽選番号は【XXXX】です！ #メスケモ大抽選会
```
（XXXXは生成された番号）

URL：`https://ys-0311san.github.io/iinnkai/lottery.html`

Intent URL の形式：
```
https://twitter.com/intent/tweet?text=私の抽選番号は【XXXX】です！%20%23メスケモ大抽選会&url=https%3A%2F%2Fys-0311san.github.io%2Fiinnkai%2Flottery.html
```
※ テキストとURLは `encodeURIComponent` で適切にエンコードする

### アクセス制限

なし。URLを知っていれば誰でもアクセス可能。既存のトークン検証ロジックは完全削除。

---

## UI 仕様

既存の lottery.html のデザイン（木目背景・和風カードスタイル）を踏襲する。

### レイアウト構成

```
[ ヘッダー：header-banner.png（クリックでindex.htmlへ） ]

[ カード ]
  タイトル：🎴 メスケモ大抽選会
  
  説明文：
    「ボタンを押して抽選番号を引こう！
     あなたの番号をXに投稿し、当選発表をお待ちください。」
  
  ─── 番号表示エリア ───
  
      あなたの番号
  
    ┌──────────────┐
    │   0 1 1 1   │  ← 大きくドラマチックに表示（font-size: clamp(3rem, 10vw, 5rem)）
    └──────────────┘
  
  [ 🐦 Xに投稿する ]  ← メインボタン（gold-accent カラー）
  [ 🔄 引き直す ]     ← サブボタン（控えめなスタイル）
  
  注意書き：
    「※ 当選番号はX公式アカウント @mesukemo_ya で発表します。」

[ フッター：© メスケモ推進委員会 ]
```

### 番号表示のアニメーション

番号生成時（初回・引き直し時）に、数字がパラパラと切り替わるスロット演出を入れる。

- 0.5〜0.8秒かけて各桁がランダムに切り替わり、最終的に結果の数字で止まる
- `setInterval` で10〜15msごとに各桁をランダム更新 → 一定時間後 `clearInterval` で確定
- 演出中はボタンを `disabled` にする

### ボタンスタイル

Xに投稿するボタン：
```css
/* gold-accent 塗り、ink-black 文字、hover で少し暗く */
background: var(--gold-accent);
color: var(--ink-black);
font-family: var(--font-display);
padding: 0.8em 2em;
border-radius: 6px;
font-size: 1rem;
border: none;
cursor: pointer;
```

引き直すボタン：
```css
/* 背景なし・gold-accent のボーダーと文字 */
background: transparent;
color: var(--gold-accent);
border: 1px solid var(--gold-accent);
/* その他は同上 */
```

---

## OGP 設定

以下に書き換える。

```html
<meta property="og:title"       content="🎴 メスケモ大抽選会">
<meta property="og:description" content="抽選番号を引いてXに投稿しよう！当選者には豪華プレゼントをお届け。">
<meta property="og:url"         content="https://ys-0311san.github.io/iinnkai/lottery.html">
<meta property="og:image"       content="https://ys-0311san.github.io/iinnkai/images/ogp-lottery.gif">
<meta name="twitter:title"      content="🎴 メスケモ大抽選会">
<meta name="twitter:description" content="抽選番号を引いてXに投稿しよう！">
<meta name="twitter:image"      content="https://ys-0311san.github.io/iinnkai/images/ogp-lottery.gif">
```

---

## 注意事項

- `images/ogp-lottery.gif` のファイルは別途ユーザーが差し替える（コードは変更不要）
- 既存の `VALID_TOKEN`・`VALID_REF` の検証ロジックは**完全削除**
- レスポンシブ対応必須（モバイルでも番号が大きく見えるよう `clamp` を活用）
- CSS変数・フォントは既存 lottery.html の定義をそのまま流用
