# なでなで茶屋 - イベントサイト

毎週土曜日 22:55~ 開催のゲーム内イベント「なでなで茶屋」の公式サイトです。

---

## 📁 ファイル構成

```
/
├── index.html              # メインHTMLファイル
├── style.css               # スタイルシート
├── script.js               # JavaScript（インタラクション）
├── README.md               # このファイル
└── images/                 # 画像フォルダ
    ├── background.jpg      # 背景画像（イベントスペースの写真）
    ├── logo.png            # 社長のキャラクター画像
    └── cast/               # キャスト画像フォルダ
        ├── cast1.jpg
        ├── cast2.jpg
        └── ...（60枚）
```

---

## 🎨 画像の追加方法

### 1. 背景画像の設定

`style.css` の `.background-image` セクションを編集：

```css
.background-image {
    background: url('images/background.jpg') center / cover no-repeat;
}
```

推奨サイズ: 1920×1080px 以上、JPEG形式、200KB以下推奨

### 2. 社長（ロゴ）画像の設定

`style.css` の `.character-logo` セクションを編集：

```css
.character-logo {
    background-image: url('images/logo.png');
    /* border-radius: 50%; を削除すると正方形になります */
}
```

推奨サイズ: 400×400px、PNG形式（透過対応）

### 3. キャストデータの編集

`script.js` の `castData` 配列を編集してください：

```javascript
const castData = [
    {
        id: 1,
        name: 'キャスト名',
        image: 'images/cast/cast1.jpg',  // 画像パス
        description: 'キャストの説明文\n\n改行は \\n で表現できます。',
    },
    // 60名分のデータを追加...
];
```

---

## 📝 コンテンツの編集

### イベント説明文の編集

`index.html` の `#about` セクション内を編集：

```html
<div class="event-description">
    <p>ここにイベントの説明文を記入してください。</p>
    <p>段落を分けるには、&lt;p&gt;タグを追加します。</p>
</div>
```

### 公式サイトURLの設定

`index.html` の `official-link` の `href="#"` を実際のURLに変更：

```html
<a href="https://your-official-site.example.com" class="official-link" ...>
```

---

## 🚀 GitHub Pagesへのデプロイ

### 1. GitHubリポジトリの作成と初回プッシュ

```bash
git init
git add .
git commit -m "feat: 初回コミット"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. GitHub Pagesの有効化

1. リポジトリの **Settings > Pages** へ移動
2. Source を **"Deploy from a branch"** に設定
3. Branch を **"main"** の **"/ (root)"** に設定
4. **Save** をクリック
5. 数分後に `https://YOUR_USERNAME.github.io/YOUR_REPO/` で公開されます

### 3. 独自ドメインの設定（オプション）

1. **Settings > Pages > Custom domain** に取得したドメインを入力
2. DNSレコードに以下を追加：
   - **A レコード**: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - または **CNAME レコード**: `YOUR_USERNAME.github.io`

---

## 🎯 機能一覧

- オープニングアニメーション（2.5秒後にフェードアウト）
- タブ切り替え（イベント概要・キャスト・公式サイト）
- キャスト検索（部分一致・リアルタイム絞り込み）
- 木札風デザインの3列グリッド
- キャスト詳細ポップアップ（ESC・オーバーレイクリックでも閉じる）
- 画像遅延読み込み（Lazy Loading）
- レスポンシブデザイン（スマートフォン対応）
- キーボードアクセシビリティ対応

---

## 🎨 デザインカスタマイズ

### カラーの変更

`style.css` の `:root` セクションで色を変更できます：

```css
:root {
    --wood-brown: #5c4033;   /* 木目茶 */
    --gold-accent: #d4af37;  /* 金色アクセント */
    /* 他の色も自由に変更可能 */
}
```

### アニメーション時間の調整

```css
.intro-screen {
    /* 2.5s の部分でフェードアウト開始タイミングを変更 */
    animation: fadeOut 1s ease-in-out 2.5s forwards;
}
```

---

## 📱 対応ブラウザ

| ブラウザ | バージョン |
|---------|-----------|
| Chrome | 最新版 |
| Firefox | 最新版 |
| Safari | 最新版 |
| Edge | 最新版 |
| iOS Safari | 最新版 |
| Android Chrome | 最新版 |

---

**なでなで茶屋** - 毎週土曜日 22:55~ 開催中！
