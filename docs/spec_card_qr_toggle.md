# 会員カードQRコードのオン/オフ切り替えチェックボックス実装仕様書

## 背景・ゴール

直近の実装で、会員カードジェネレーター（`secret-card.html` / `card-generator.js`）の
フッター右側に `https://mesukemo.uk` へリンクする実QRコード（`drawFooterQrCode()`）を
追加した。これを表示するかどうかをユーザーがチェックボックスで切り替えられるようにする。

`index.html` / `style.css` / `script.js` / `print-card/` など、他のファイルには
一切手を加えないこと。

## 変更対象

- `secret-card.html`
- `card-generator.js`

## UI追加

`secret-card.html` の「会員ランク」`<div class="form-group">`（`id="cardType"` のselectを含む
ブロック、118行目付近の生成ボタンの直前）の後に、新しい `form-group` としてチェックボックスを追加する。

- 既存の `form-group` / `label` のマークアップ・クラス構成に合わせること
  （このプロジェクトに既存のチェックボックスUIパターンは無いため、他の `form-group` の
  構造・インデントスタイルを踏襲しつつ、`<input type="checkbox">` を使う）
- id: `qrToggle`
- ラベル文言: 「QRコードを表示」
- デフォルト: チェック済み（`checked`）＝表示ON

## card-generator.js側の実装

- `drawCardFooter(ctx, theme)` 内で `drawFooterQrCode(ctx, cy)` を呼ぶ直前に、
  `qrToggle` チェックボックスの状態を見て、OFFなら呼び出さない
  （QRを描かない。台座・モジュールとも一切描画しない）
- チェックボックスの状態変更（`change` イベント）でプレビューが即座に再描画されるよう、
  `setupEventListeners()` 内の既存パターン
  （`['userName', 'userTitle', 'favoriteSpecies', 'userComment', 'cardType'].forEach(...)`
  で `input`/`change` リスナーを付けている箇所）に `qrToggle` を追加するか、
  同等の方法で `drawPreviewCard` が呼ばれるようにすること
- `resetForm()` 内で、他の項目リセットと同様に `qrToggle` を `checked = true`
  （デフォルトのON）へ戻すこと
- QRオフ時、フッター内の他要素（ロゴ・モットーテキスト）のレイアウトは変更しなくてよい
  （QR領域が単純に空くだけで問題ない）

## セルフチェック

- チェックボックスON/OFFでプレビューが即座に切り替わることをブラウザで確認する
- ON状態でのQRが引き続き `https://mesukemo.uk` として正しくスキャンできることを確認する
  （前回同様、可能であれば `pyzbar` または OpenCV `QRCodeDetector` でデコード確認）
- 「もう一度作成」（`resetFormBtn` → `resetForm()`）を押した後、チェックボックスがONに
  戻っていることを確認する
- regular / cast / vip の3テーマそれぞれでON/OFF切り替えが正しく機能することを確認する
