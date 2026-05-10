# 実装仕様書：イベントについてページのレイアウト整理

対象ファイル: `index.html` / `script.js`

---

## 修正1：ルールセクションを参加ステップの直下に移動

**ファイル:** `index.html`

**現在の about-main 内の順序:**
1. About This Group
2. 参加ステップ（guide-section）
3. イベントポスター（event-posters）
4. プロモーション動画（promo-video-section）
5. **ルール（about-rule）← 現在ここ**
6. コミック（about-manga）

**修正後の順序:**
1. About This Group
2. 参加ステップ（guide-section）
3. **ルール（about-rule）← ここに移動**
4. イベントポスター（event-posters）
5. プロモーション動画（promo-video-section）
6. コミック（about-manga）

具体的には、`<div class="about-rule">` ブロック全体（h3とpを含む）を
`</div><!-- guide-section 閉じ -->` の直後、`<!-- ポスター -->` の直前に移動する。

元の位置（promo-video-sectionとabout-mangaの間）にある about-rule ブロックは削除する。

---

## 修正2：サイドバーを「イベント概要」「Q&A」の2項目に変更

**ファイル:** `script.js`

**現在の sidebarData.about（line 364付近）:**
```js
about: [
    { id: 'about-main', label: 'イベントについて' },
    { id: 'about-guide', label: '参加条件' },
    { id: 'about-faq', label: 'FAQ' },
],
```

**修正後:**
```js
about: [
    { id: 'about-main', label: 'イベント概要' },
    { id: 'about-faq', label: 'Q&A' },
],
```

---

## 修正3：about-guide サブセクションを廃止

**ファイル:** `index.html`

サイドバーから「参加条件」を除いたため、`about-guide` サブセクションは不要になる。
`<div class="sub-section" id="about-guide">` ブロック全体（閉じタグまで）を削除する。

参加条件の内容（「VRChatアカウントがあれば誰でも参加できます」の文章）は、
about-main の ルール セクション（修正1で移動済み）内の paragraph として追記する。

ルールセクション修正後のイメージ:
```html
<div class="about-rule">
    <h3 class="about-title">ルール</h3>
    <p>VRChatアカウントがあれば誰でも参加できます。アバターの種類・人間・ケモノ問わず大歓迎です。メスケモアバターでなくても参加できます。</p>
    <p>メスケモアバターを使用していなくても、メスケモが好きという気持ちがあれば貴方は既にメスケモ推進委員会です。「人間」でも「人外」でも「オスケモ」でもだれでも参加可能！世界をメスケモで満たすために各々の力で邁進していきましょう！</p>
</div>
```

---

## 実装後の確認事項

- [ ] about-main 内でルールが参加ステップの直後に表示されること
- [ ] PC版の左サイドバーに「イベント概要」「Q&A」の2項目が表示されること
- [ ] Q&Aをクリックすると FAQ セクション（about-faq）に切り替わること
- [ ] about-guide サブセクションが残っていないこと
- [ ] 既存のその他タブ（キャスト・公式サイト・お知らせ）に影響がないこと
