# 名刺表面にキャラクター写真を配置

## 背景

名刺表面（front）の右側に空けておいたスペースに、キャラクターの写真を
四角い写真枠として配置する。画像は既に用意済み。

- `print-card/assets/character-photo.png`（RGB、1510×1820px、アスペクト比 約0.83）
- `print-card/assets/character-photo-cmyk.jpg`（CMYK版、同内容）

どちらも既に配置済みなので、新規に画像処理をする必要はない
（トリミング・リサイズ・CMYK変換は完了済み）。今回のタスクはこれをレイアウトに
組み込むことのみ。

`print-card/` 以外のファイルには一切手を加えないこと。

## 配置仕様

安全エリア（`.safe-area`、左上基準で 85mm×49mm）内、相対座標で以下に配置する。

- 幅: 34mm、高さ: 41mm（画像のアスペクト比 約0.83 を維持。object-fit: cover 等で
  はみ出す場合は中央基準でクロップしてよい）
- 位置: 安全エリア内 left=49mm, top=4mm
  （名前プレート [left=0,top=0,46mm×15mm] や banner-logo
  [left=0,bottom=0,31mm×約5.8mm] とは重ならない）

## 見た目の仕様（既存デザインとの統一感）

- 名刺全体の「金枠・木札」のテイストに合わせ、写真の周囲に細い金のライン枠
  （目安 0.4〜0.5mm、色は既存の金アクセントに近い色）を付ける
- 名前プレート（`make_name_plate`）と同様に、軽いドロップシャドウを付けて
  背景から浮いて見えるようにする（既存の名前プレートの影処理を参考にしてよい）
- QRのような白い台座（クワイエットゾーン）は不要。写真そのものに直接金枠を
  付ける形でよい

## 実装対象

### `card.html` / `card.css`（WeasyPrint, RGB確認用）
- `.card-front .safe-area` 内に `<img class="character-photo" src="assets/character-photo.png" alt="">` を追加
- `.character-photo` に上記の位置・サイズ・金枠・ドロップシャドウのCSSを追加

### `build.py`（ReportLab, CMYK入稿用）
- 表面描画部分に `character-photo-cmyk.jpg` を `c.drawImage()` で追加
  （位置・サイズはCSS側とmm単位で一致させること）
- 金枠は `c.rect()` や `c.roundRect()` のストローク、またはドロップシャドウは
  半透明の矩形描画で近似してよい（名前プレートの実装が参考になる）

## セルフチェック

- 名刺表面プレビューで、名前プレート・banner-logo・キャラクター写真の3要素が
  重ならず、安全エリア内に収まっていること
- 写真の金枠が視認でき、背景（黒×金トーン）から浮いて見えること
- RGB版・CMYK版で写真の位置・サイズが一致していること
- これまでのセルフチェック項目（2ページ、97×61mm、QRスキャン可能性など）も
  再確認すること

## 出力

- `print-card/output/meishi_mesukemo_cmyk.pdf`
- `print-card/output/meishi_mesukemo_rgb.pdf`
- `print-card/output/meishi_mesukemo_preview_front.png`
- `print-card/output/meishi_mesukemo_preview_back.png`
