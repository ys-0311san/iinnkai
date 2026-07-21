# 名刺 表面: 装飾フレーム撤去 ＋ 名前とロゴを右下コーナーにまとめる

## 背景

`print-card/` は縦型55×91mm（塗り足し込み61×97mm）の両面名刺。
表面は一枚絵フルブリード背景＋下部中央のフッター帯（名前「yuki__san」を上、
`header-banner.png` ロゴを下、どちらも幅49mm一杯で水平中央揃え）＋
外周の箔押し風金枠（`draw_frame()`）という構成になっている。

これを次の2点だけ変更する。**それ以外の要素（背景写真・スクリム・裏面）は一切変更しない。**

1. **表面のフレームを撤去**: `draw_frame()` を表面には適用しない（裏面は従来通り継続使用）
2. **名前とロゴを右下コーナーに小さくまとめる**: 現行の「幅49mm一杯・中央揃えのフッター帯」を廃止し、
   名前「yuki__san」とロゴ画像を右下の隅にまとめた小さなサイン風の要素に置き換える。
   名前が上・ロゴが下（現行の並び順を踏襲）、右揃えで縦に積む。
   コーナーに収まるサイズ感にするため、両方とも現行より小さくする
   （目安: 名前フォント 19.4pt → 11〜12pt 程度、ロゴ幅 26mm → 15〜16mm 程度。
   実際に生成して視認性とバランスを見ながら微調整してよい）

`print-card/` 以外のファイルには一切手を加えないこと。前回の縦型リデザイン
（`docs/spec_meishi_vertical_redesign.md`）で確定した背景写真のクロップ・
配置・下部スクリムのロジックは変更しない。

## 変更箇所

### `print-card/generate_background.py`

`build_front_from_photo()` 内の `draw_frame(front)` 呼び出しを削除する。
（`build_backgrounds()` の裏面側 `draw_frame(back)` はそのまま残す）

### `print-card/card.html` / `print-card/card.css`（RGB確認用）

- `.front-footer` を「幅49mm・中央揃え」から「右下揃え」のレイアウトに変更する。
  `position: absolute` で safe-area の右下（`right: 0; bottom: ...`）に固定し、
  `align-items: flex-end`（右揃え）にする。幅は内容に合わせて自動でよい
  （`width: 49mm` を指定する必要はない）
- `.name` のフォントサイズを縮小する（19.4pt → 11〜12pt 相当）。他のスタイル
  （フォント・色・text-shadow）は踏襲してよい
- `.banner-logo` の幅を縮小する（26mm → 15〜16mm 相当）
- 名前・ロゴ間の gap は縮小してよい（コーナーに収まるサイズ感に）
- 右下の余白は safe-area 内に収まるよう適切なマージンを取る
  （目安: 右端・下端から2〜3mm程度）

### `print-card/build.py`（CMYK直描画・入稿用）

`write_cmyk_pdf_direct()` の表面描画部分を右下揃えに書き換える。

- 名前 `name_x` を中央揃えの計算から、右揃え
  （`page_w - safe_area右マージン - name_w` 相当）の計算に変更する
- ロゴ `header-banner-cmyk.jpg` の描画位置も同様に右揃えに変更する
- 名前・ロゴのフォントサイズ／表示幅を card.css と揃えた縮小後の値にする
  （`HEADER_BANNER_DISPLAY_MM` 等の定数を使っている場合はそちらも合わせて変更）
- 名前とロゴの縦位置関係（名前が上、ロゴが下）は現行を踏襲する
- 安全エリア（左右6mmマージン）からはみ出さないこと

## セルフチェック

- `python build.py` が正常終了し、2ページのRGB・CMYK PDFが61mm×97mmで出力されること
- 表面プレビュー画像で、外周の金枠・四隅の菱形アクセントが表面には一切表示されないこと
  （裏面には引き続き表示されること）
- 表面プレビュー画像で、名前「yuki__san」とロゴが右下の隅に小さくまとまっており、
  安全エリア内に収まっていること
- 名前・ロゴが写真背景の上で十分なコントラストを保ち、判読できること
- 裏面のレイアウト・フレームは前回から変更されていないこと
- CMYK PDF内の画像がすべて `/DeviceCMYK` であること

## 出力

- `print-card/output/meishi_mesukemo_cmyk.pdf`
- `print-card/output/meishi_mesukemo_rgb.pdf`
- `print-card/output/meishi_mesukemo_preview_front.png`
- `print-card/output/meishi_mesukemo_preview_back.png`
