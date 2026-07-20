# 名刺のリンク一覧から「WEB」行を削除する

## 背景

`print-card/card.html` のリンク一覧（`.link-list`）に以下2行がある。

```html
<p><span>WEB</span> mesukemo.uk</p>
<p><span>X</span> @mesukemo_ya</p>
```

名刺には既にQRコード（`https://mesukemo.uk` を符号化）があるため、
「WEB mesukemo.uk」の行は冗長。この行のみ削除する。

団体名の下にある副題行 `<p class="site">mesukemo.uk</p>`（`.identity` 内）は
そのまま残す。削除対象は `.link-list` 内の「WEB」行のみ。

## 変更対象

- `print-card/card.html`
- `print-card/card.css`（`.link-list` は `X` の1行だけになるため、
  `.links` の `justify-content: space-between` によるレイアウトが崩れないか確認し、
  崩れる場合は微調整する。空いたスペースはバランスよく余白として扱ってよい）

## 作業手順

1. `card.html` から「WEB」の `<p>` 行を削除
2. 見た目を確認し、`.link-list` / `.links` のレイアウトが不自然でなければ
   CSSは変更不要。空きすぎる・詰まりすぎるなど不自然な場合のみ最小限調整する
3. `print-card/build.py` を再実行し、出力を再生成する
   （`fonts/` が無ければ `download_fonts()` が自動取得するので通常のビルド手順でよい）
4. 既存のセルフチェック（PDFページサイズ 97×61mm、安全エリア内配置、CMYK化、
   文字・ロゴ・QRの視認性）を再確認する

## 出力

- `print-card/output/meishi_mesukemo_cmyk.pdf`
- `print-card/output/meishi_mesukemo_rgb.pdf`
- `print-card/output/meishi_mesukemo_preview.png`

他のファイル（`index.html` / `style.css` / `script.js` / `secret-card.html` /
`card-generator.js` など）には一切手を加えないこと。
