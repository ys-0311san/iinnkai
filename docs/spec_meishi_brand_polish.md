# 名刺デザイン改善（ブランドレビュー反映）

## 背景

`print-card/` の名刺デザインについて、ブランド観点でのレビューを実施した結果、
以下4点の具体的な改善指示が出た。これを実装する。

このカードは2つの描画パスで構成されており、**両方に同じ変更を反映すること**。

- `print-card/card.html` + `print-card/card.css`（WeasyPrintでRGB確認用PDFを生成）
- `print-card/build.py` の `write_cmyk_pdf_direct()`（ReportLabで入稿用CMYK PDFを直接生成）

見た目が2つのパスで食い違わないよう、変更後は両方のPDFを再生成し、
プレビューで見比べて一致していることを確認すること。

他のファイル（`index.html` / `style.css` / `script.js` / `secret-card.html` /
`card-generator.js` など）には一切手を加えないこと。

## 変更1: 個人名の背後に「墨」の帯を追加

現状、名刺全体が茶系の中間色のみで、サイト本体で多用されている墨色
（`--ink-black: #1a1a1a`）の要素が無く締まりに欠けるという指摘があった。

- 個人名（`yuki__san`）の背後に、幅約40mm×高さ約12mmの半透明ダーク帯を敷く
- 色: `#1a1a1a`、不透明度 0.28〜0.35（具体的な値は見た目を見て調整してよい）
- レイヤー順: 背景(木目画像)の上、個人名テキストの下
- 帯は個人名テキストを中心に、上下左右に適度な余白ができる大きさ・位置にすること
  （テキストの実測幅を見て、帯がはみ出しすぎたり窮屈になったりしないよう調整）
- 安全エリア（中央85mm×49mm）からはみ出さないこと
- `card.css`側: `.person` 要素の背景、または疑似要素・ラッパーで実装してよい
- `build.py`側: ReportLabの半透明矩形描画（`setFillAlpha`）で同等の帯を描画

## 変更2: 団体名のletter-spacing調整

サイト本体の見出しは `letter-spacing: 0.1em` を使っているが、名刺の団体名
（「メスケモ推進委員会」）は 0 のままで浮いている。

- `card.css` の `.organization` に `letter-spacing: 0.08em` を追加
- `build.py` のReportLab側も、団体名描画時に同等の字間（フォントサイズ12.5ptの
  0.08em ≒ 1.0pt）を `canvas.setCharSpace()` で設定し、描画後に0へ戻すこと

## 変更3: X表記のサイズと位置調整

現状「X @mesukemo_ya」が 6.7pt と印刷可読の下限に近く、かつ位置が枠上部に
浮いていて団体名ブロック（特に副題「mesukemo.uk」）と視覚的に繋がっていない。

- フォントサイズを 6.7pt → 7.2pt に変更
- 縦位置を、副題「mesukemo.uk」と高さが揃うように調整する
  - `card.css`: `.link-list` の配置（`padding-top` 等）を調整し、
    「X @mesukemo_ya」の行の高さが `.site`（mesukemo.uk）と視覚的に
    水平に並ぶようにする
  - `build.py`: 現在 `page_h - mm_to_pt(9.4 + idx * 4.1)` で描画している
    Y座標を、`mesukemo.uk` 副題の描画位置（`page_h - mm_to_pt(17.2)`）と
    揃うよう変更する
- 変更後、両パスのPDF/プレビューを見て実際に高さが揃っていることを確認すること
  （ヘッドレスブラウザでの座標測定や画像比較などで検証してよい）

## 変更4: 入稿用CMYK金色の手動指定

金 `#d4af37` はCMYK変換でくすむため、入稿用データでは意図的にくすみを
最小限にする値を手動指定する。

- `build.py` の `write_cmyk_pdf_direct()` 内、現在
  `gold = CMYKColor(0.0, 0.18, 0.74, 0.17)` となっている値を
  `CMYKColor(0.20, 0.35, 0.75, 0.10)`（C20 M35 Y75 K10）に変更する
- RGB確認用PDF（`card.css`側の `#d4af37`）は変更不要（画面表示用のため現状維持）

## 出力・再検証

- `print-card/output/meishi_mesukemo_cmyk.pdf`
- `print-card/output/meishi_mesukemo_rgb.pdf`
- `print-card/output/meishi_mesukemo_preview.png`
  （CMYK PDFから生成すること。この環境にGhostscriptが無い場合は、
  PyMuPDF (`pip install pymupdf`) 等、PDFに埋め込まれたフォントを正しく
  レンダリングできるツールでPNG化すること。フォールバックで代替フォント
  になるレンダラは使わないこと）

これまでのセルフチェック項目（PDFページサイズ97×61mm、安全エリア内配置、
CMYK化、文字・ロゴ・QRの視認性、QRスキャン可能性）も再確認すること。

## 対象外（今回はやらない）

透過画像（マスコット等）の配置は、画像ファイルがまだ用意されていないため
今回の実装対象外。将来的に画像が用意された際に、安全エリア中央やや右
（ロゴとQRの谷間、目安 幅18×高32mm／x:44〜62mm, y:9〜46mm、前面100%、
QRから3mm以上離す）に配置する想定であることのみ留意し、その領域を
今回の墨帯やレイアウト調整で塞ぎすぎないようにすること。
