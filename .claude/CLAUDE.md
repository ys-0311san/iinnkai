# メスケモ推進委員会サイト — Claude 作業ルール

## プロジェクト概要

VRChatイベント「メスケモ推進委員会」の公式サイト（静的HTML/CSS/JS）。
和風旅館テーマ（墨・木・金）のデザインシステムを使用している。

---

## 視認性（コントラスト）ルール

このプロジェクトでは「薄い背景に薄い文字」が発生しやすい。CSS を書く・修正するときは以下を必ず守ること。

### テキスト色の alpha 下限

| 用途 | alpha 下限 |
|---|---|
| 本文・ラベル・説明文 | **0.85 以上** |
| ナビ・サイドバー 非アクティブアイテム | **0.80 以上** |
| ヒント・補助テキスト（help-text, hint 等） | **0.65 以上** |
| アイコン・装飾マーカー（Q./A. 等） | **0.80 以上**、または CSS 変数で指定 |

### 茶系アクセントカラー

`rgba(139, 111, 71, *)` を透明度付きでテキストに使わない。
代わりに CSS 変数 `var(--cedar)` (#8b6f47) または `var(--wood-brown)` (#5c4033) を使う。

### 装飾要素（変更不要）

ボーダー、ボックスシャドウ、セパレーター線など **テキスト以外** の装飾要素の `rgba` はコントラスト規則の対象外。薄くて構わない。

---

## CSS カスタムプロパティ（カラーパレット）

```css
--ink-black:   #1a1a1a
--charcoal:    #2d2d2d
--wood-brown:  #5c4033
--cedar:       #8b6f47
--gold-accent: #d4af37
--paper-white: #f5f3ed
--cream:       #ebe6d9
```

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.html` | メインサイト（タブ構成：about / cast / community / events） |
| `style.css` | メインサイトのスタイル |
| `script.js` | メインサイトのJS（タブ切替・キャストデータ・各種インタラクション） |
| `secret-card.html` | 会員カードジェネレーター |
| `card-style.css` | カードジェネレーターのスタイル |
| `card-generator.js` | カードジェネレーターのJS（canvas描画・ダウンロード等） |
| `docs/` | Codex CLI 向け実装仕様書 |

---

## 開発ルール

- `npm run dev` / `npm install` は実行しない（既に起動済み）
- コミット・プッシュは必ずユーザーの指示を受けてから行う
- コード実装のフローは「Claudeが仕様書（`docs/spec_*.md`）作成 → Codex CLI で実行 → Claude が差分レビュー → Claude が Edit/Write で既存ファイルに適用」
- 新規ファイルの作成は Codex CLI 担当。既存ファイルへの Edit/Write 適用は Claude が行う
- レスポンシブ対応（モバイル/PC）を常に意識する

## ローカルサーバーの起動とブラウザ確認

「localhostで開いて」「ブラウザで確認して」などの指示が来たら以下の手順を実行する。

```bash
# 1. サーバーが起動済みか確認
ss -tlnp | grep 8080

# 2. 起動していなければバックグラウンドで起動
cd "/mnt/c/Users/yuuya/Desktop/メスケモ推進委員会" && python3 -m http.server 8080 &>/tmp/httpserver.log &

# 3. 起動確認（200が返れば成功）
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/

# 4. WindowsブラウザでURLを開く
/mnt/c/Windows/System32/cmd.exe /c start http://localhost:8080/<対象ファイル>
```

- WSL2環境のため `cmd.exe` / `powershell.exe` は PATH に存在しない。必ずフルパス `/mnt/c/Windows/System32/cmd.exe` を使う。
- `xdg-open` や `wslview` は使用不可。
