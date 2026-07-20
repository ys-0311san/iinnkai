# 麻の葉模様を全面ベタ敷きから縁取りアクセントに変更

## 問題

`print-card/generate_background.py` の `draw_kumiko()` が、名刺の内側全体
（`left=4.9mm` 〜 `right-4.9mm`、`top=4.9mm` 〜 `bottom-4.9mm` の矩形フル）に
麻の葉模様をベタ敷きしている。

今後、名刺中央やや右のエリア（目安 x:44〜62mm, y:9〜46mm）に透過PNGの
マスコットイラストを配置する予定がある。模様を画面全体に敷いてしまうと、
イラストを置いたときに背景が競合してうるさくなる。模様は金枠に沿った
「縁取りのアクセント」に留め、中央エリアは無地（木目のみ）にすべき。

## 変更内容

`generate_background.py` の `draw_kumiko()` を修正し、模様を描画する範囲を
「外側の矩形から、内側にもう一段小さい矩形をくり抜いたリング状の帯」に限定する。

- 外側境界: 現状と同じ `left=4.9mm, top=4.9mm, right=size-4.9mm, bottom=size-4.9mm`
- 内側境界: 外側からさらに 9〜10mm 内側（帯の幅がそれくらいになるように）
- マスクは「外側矩形 かつ 内側矩形の外」の領域のみ255にする
  （現状は外側矩形をそのまま255にしているのを、リング状に変更する）
- 模様の線の色・不透明度・線幅・間隔は現状のままでよい
  （`color = (212, 175, 55, 22)`, `width = mm(0.15)`, `spacing = mm(8.0)`）

## 再生成・確認

- `python build.py` を実行し、以下を再生成する
  - `print-card/assets/card-bg.png`
  - `print-card/assets/card-bg-logo-cmyk.jpg`
  - `print-card/output/meishi_mesukemo_cmyk.pdf`
  - `print-card/output/meishi_mesukemo_rgb.pdf`
  - `print-card/output/meishi_mesukemo_preview.png`
    （Ghostscript が無い場合はPyMuPDF等、埋め込みフォントを正しく描画できる
    ツールで生成すること）
- プレビューを見て、模様が金枠に沿った帯状のみに現れ、名刺中央
  （個人名プレートより上、ロゴ行より下の広いエリア）が無地になっている
  ことを確認する
- 木札プレート・団体名・個人名・QR・Xなど、他の要素の位置や見た目は
  変更しないこと。今回のスコープは麻の葉模様の適用範囲のみ

`print-card/` 以外のファイルには一切手を加えないこと。
