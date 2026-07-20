# 名刺表面の背景を整理（白ボケ除去・細かい模様の削除）

## 問題

名刺表面（front、黒×金トーンの背景）について指摘があった。

1. 背景中央が白っぽく・ぼやけて見える
   （`generate_background.py` の `color_grade_wood()` にある、中央を明るくする
   `glow` 処理と、周辺のみ暗くする `vignette` 処理の組み合わせで、中央が
   相対的に明るい「月のような」丸いにじみになっているため）
2. 麻の葉の組子模様（`draw_kumiko()`）が細かすぎて、印刷時につぶれて
   汚く見える懸念がある

## 対応

`print-card/generate_background.py` を修正する。**裏面（back）の見た目は
一切変更しないこと**。表面（front）のみが対象。

1. `color_grade_wood(img, mode="front")` について、中央を明るくする
   `glow` 処理を無効化するか、効果がほぼ見えなくなるレベルまで大幅に弱める
   （目安: `glow_strength` を front では 0 にする）。`vignette` も、中央と
   周辺の明暗差が目立たない程度まで弱める（目安: `vignette_strength` を
   現状の132から半分以下に）。表面の背景は、中央にボケた明るい丸模様が
   出ない、なるべく均一な黒に近いトーンにすること。
2. `draw_kumiko()`（麻の葉模様）は、表面の背景生成では呼び出さない
   （`build_backgrounds()` 内で front 用の背景を作る際にこの関数を
   スキップする）。裏面ではこれまで通り呼び出すこと。

修正後、`python build.py` を実行して以下を再生成する。

- `print-card/assets/card-bg-front.png` / `card-bg-front-cmyk.jpg`
- `print-card/output/meishi_mesukemo_cmyk.pdf`
- `print-card/output/meishi_mesukemo_rgb.pdf`
- `print-card/output/meishi_mesukemo_preview_front.png`
- `print-card/output/meishi_mesukemo_preview_back.png`

## セルフチェック

- 表面プレビューを見て、中央の白っぽいボケ・にじみが無くなっていること
- 表面プレビューを見て、麻の葉模様が消えていること（金枠・四隅の菱形アクセントは
  そのまま残す）
- 裏面プレビューが変更前と見た目上まったく変わっていないこと
  （麻の葉模様・グロー効果とも維持されていること）
- 名前プレート・キャラクター写真・banner-logoの位置やサイズは変更しないこと
- 2ページPDF・97×61mm・QRスキャン可能性など、既存のセルフチェック項目も再確認する

`print-card/` 以外のファイルには一切手を加えないこと。
