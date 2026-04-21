# 技術辞書 - メスケモ推進委員会サイト

このプロジェクトで使用・検証した技術のリファレンス。次回以降の実装で再利用できるパターンをまとめる。

---

## BGMプレイヤー

### ブラウザAutoplay制限の回避
ページ読み込み時に音声を自動再生すると多くのブラウザでブロックされる。
**解決策**: 最初のユーザー操作（click/keydown/touchstart）を検知してから再生開始する。

```javascript
const startOnFirstInteraction = () => {
    playBgm();
    document.removeEventListener('click', startOnFirstInteraction);
    document.removeEventListener('keydown', startOnFirstInteraction);
    document.removeEventListener('touchstart', startOnFirstInteraction);
};
document.addEventListener('click', startOnFirstInteraction);
document.addEventListener('keydown', startOnFirstInteraction);
document.addEventListener('touchstart', startOnFirstInteraction, { passive: true });
```

### ランダム曲選択
```javascript
const idx = Math.floor(Math.random() * tracks.length);
const audio = new Audio(tracks[idx].src);
audio.loop = true;
audio.volume = 0.1; // 環境音として使う場合は0.1前後が適切
audio.play().catch(() => {}); // エラーを握りつぶす（Autoplayブロック時）
```

### 著作権フリー音源（和風）
- **甘茶の音楽工房** https://amachamusic.chagasi.com/
  - 商用・非商用問わず無料
  - **直リンク禁止**: mp3ファイルは必ずダウンロードして自サーバーに配置すること
  - クレジット表記推奨（必須ではない）
  - 和風カテゴリ: `/genre_asia.html`
- **DOVA-SYNDROME** https://dova-s.jp/
  - 同様に無料・商用OK

---

## Canvasパーティクルアニメーション（桜吹雪）

### 基本構造
```javascript
// 花びらオブジェクト
const petal = {
    x, y,           // 位置
    size,           // サイズ（px）
    speedY,         // 落下速度
    speedX,         // 横揺れ速度
    rotation,       // 回転角度
    rotationSpeed,  // 回転速度
    opacity,        // 透明度
    color,          // 色
};

// アニメーションループ
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    petals.forEach(p => { update(p); draw(p); });
    animationId = requestAnimationFrame(animate);
}

// 停止
cancelAnimationFrame(animationId);
```

### イントロ→背景への移行パターン
イントロ中は前面（z-index: 9999）、終了後は最背景（z-index: -1）へ移行する。

```css
#sakuraCanvas { z-index: 9999; opacity: 0; transition: opacity 0.8s; }
#sakuraCanvas.active { opacity: 1; }
#sakuraCanvas.behind { z-index: -1; } /* bg-layerと同じ層、HTML順で上に来る */
```

```javascript
function moveSakuraBehind() {
    canvas.classList.remove('active');
    setTimeout(() => {
        canvas.classList.add('behind');
        canvas.classList.add('active');
    }, 900);
}
```

### z-index レイヤー構造（このプロジェクト）
| 要素 | z-index | 役割 |
|---|---|---|
| `.bg-layer` | -1 | 背景画像 |
| `#sakuraCanvas.behind` | -1 | 桜（背景の直上、HTML順で後） |
| `.main-content` | auto | コンテンツ全体 |
| `.site-header` | 500 | 固定ヘッダー |
| `.side-drawer` | 1100 | スマホドロワー |
| `.bgm-player` | 9000 | BGMボタン |
| `#sakuraCanvas`（イントロ中） | 9999 | 桜（最前面） |
| `.loading-screen` | 9999 | ローディング画面 |

### タブ切り替えで表示/非表示
```javascript
// activateTab関数内に追記
const sakura = document.getElementById('sakuraCanvas');
if (sakura && sakura.classList.contains('behind')) {
    sakura.classList.toggle('active', targetId === 'about' || targetId === 'news');
}
```

---

## Xタイムライン埋め込み

### 結論: 公式ウィジェットは不安定（2025年現在）
429エラー（レート制限）が実際には制限していないのに発生する。ログイン状態・プランによって挙動がバラバラ。ユーザー側での修正は不可能。

### 個別ツイート埋め込み（現在も動作する）
```html
<blockquote class="twitter-tweet" data-theme="dark">
    <a href="https://twitter.com/account/status/ツイートID"></a>
</blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
```
タイムライン全体ではなく特定投稿を1〜2件埋め込む用途には有効。

---

## Codex CLI 非インタラクティブ実行

### 基本コマンド
```bash
# workspace-write: プロジェクト内ファイルへの書き込みを許可
codex exec -s workspace-write "プロンプト"
```

### ポイント
- `codex`（インタラクティブ）はバックグラウンド実行不可（stdin is not a terminal エラー）
- `codex exec` で非インタラクティブ実行が可能
- `-s workspace-write` を付けないとファイル書き込みが拒否される
- 長いプロンプトはヒアドキュメントより引用符内で改行した方が安定

---

## ドメイン取得・GitHub Pages設定

### Cloudflare Registrar
- 仕入れ値そのまま（マークアップなし）で最安水準
- `.uk` / `.com` / `.net` などを取り扱い
- `.moe` は取り扱いなし（2025年時点）
- .uk登録時の個人設定: タイプ = **IND**、組織 = 空欄

### GitHub Pages カスタムドメイン設定
1. Cloudflare DNS に以下を追加（プロキシOFF=DNSのみ）:
   ```
   A @ 185.199.108.153
   A @ 185.199.109.153
   A @ 185.199.110.153
   A @ 185.199.111.153
   CNAME www ys-0311san.github.io
   ```
2. GitHub → Settings → Pages → Custom domain に入力 → Save
3. Enforce HTTPS にチェック
4. DNS反映: 通常30分〜数時間、最大48時間

---

## フローティングUI設計パターン

### 固定ボタン（右下）
```css
.floating-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9000;
    background: rgba(20, 15, 10, 0.85);
    border: 1px solid rgba(180, 130, 80, 0.5);
    border-radius: 30px;
    backdrop-filter: blur(8px);
}
```

### 和風カラーパレット（このプロジェクト）
```css
--wood-brown: #5c4033;    /* 茶色見出し */
--gold-accent: #d4af37;   /* ゴールドアクセント */
--paper-white: #f5f3ed;   /* 和紙白 */
rgba(180, 130, 80, 0.5)   /* ボーダー・装飾用 */
rgba(20, 15, 10, 0.85)    /* 暗い半透明背景 */
#e8d5b0                   /* クリーム色テキスト */
```

---

## VRChatグループリンク形式
```
https://vrchat.com/home/group/grp_XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
```
