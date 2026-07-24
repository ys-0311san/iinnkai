# 名刺ジェネレーター（print-card/generator/）— 裏面の金文字を彫り込み風・深めの金色に変更

対象ファイル: `print-card/generator/card_builder.py` のみ
（`print-card/build.py` / `print-card/generate_background.py` には一切触れない。背景画像アセットは変更しない）

## 背景・目的

裏面の `<LINK>` / `<WEBSITE>` 文字が `CMYKColor(0.05, 0.12, 0.45, 0.0)` という薄い黄土色のベタ塗りで、
CMYK印刷だと「くすんだ薄黄色」に見えてしまう問題がある。同ファイル内の `_draw_front_signature()`
（表面の名前・X ID）が既に「影を右下にずらして描く→ハイライトを左上にずらして描く→本体色を描く」という
3層の彫り込み風テクニックで立体感を出しているので、同じ考え方を裏面の金文字にも適用し、
かつ色自体もより深みのある金色に変更する。

## 実装

`_draw_back()` の直前に、彫り込み風の中央揃えテキストを描く共通ヘルパーを追加する:

```python
def _draw_engraved_centered_text(
    c: canvas.Canvas,
    center_x: float,
    y: float,
    text: str,
    font_name: str,
    font_size: float,
    base_color: CMYKColor,
) -> None:
    shadow_offset = mm_to_pt(0.14)
    highlight_offset = mm_to_pt(0.07)
    c.setFont(font_name, font_size)
    c.setFillColor(CMYKColor(0.0, 0.0, 0.0, 0.85, alpha=0.6))
    c.drawCentredString(center_x + shadow_offset, y - shadow_offset, text)
    c.setFillColor(CMYKColor(0.0, 0.05, 0.15, 0.0, alpha=0.35))
    c.drawCentredString(center_x - highlight_offset, y + highlight_offset, text)
    c.setFillColor(base_color)
    c.drawCentredString(center_x, y, text)
```

`_draw_back()` 内の該当2箇所を書き換える。まず `gold` の定義を、より深みのある琥珀金に変更する:

```python
gold = CMYKColor(0.08, 0.28, 0.75, 0.10)
```

（旧: `CMYKColor(0.05, 0.12, 0.45, 0.0)`。新しい値は彩度・濃度を上げた琥珀色〜真鍮色寄りの金）

続いて、以下2箇所の `c.setFont(...)` + `c.setFillColor(gold)` + `c.drawCentredString(...)` の3行を、
それぞれ `_draw_engraved_centered_text(...)` の呼び出し1行に置き換える:

```python
_draw_engraved_centered_text(c, page_w / 2, page_h - mm_to_pt(53.5), "<LINK>", "ZenMaruGothic", 6.5, gold)
```

```python
_draw_engraved_centered_text(c, page_w / 2, page_h - mm_to_pt(60.2), "<WEBSITE>", "ZenMaruGothic", 6.0, gold)
```

**"X @mesukemo_ya"（`offwhite`色の行）はそのまま変更しない**（白文字なので今回の「金がくすむ」問題とは無関係）。

## 動作確認の観点

1. `python -m py_compile generator/card_builder.py` が通ること
2. `generate_pdf()` を実行し、裏面の `<LINK>` と `<WEBSITE>` の文字に影＋ハイライトによる立体感が付き、
   以前より深みのある金色になっていることを目視確認する（`<LINK>`/`<WEBSITE>`以外の裏面要素・表面は変化しないこと）
3. `print-card/build.py` と `print-card/generate_background.py` に差分が無いこと
