# 横型ポップ名刺（card_v5_pop）ジェネレーター統合 実装仕様書

## 背景・ゴール

既存の名刺ジェネレーター（`print-card/generator/`）は **縦型55×91mm** の1テンプレートのみ。
これに、チャットで先行制作した **横型ポップ名刺「card_v5_pop」（97×61mm・CMYK・塗り足し3mm）** を
**「デザイン選択肢」として追加**する。ユーザーが冒頭で「縦型（従来）／横型ポップ」を選び、
横型を選んだときは横型専用のフォーム項目・簡易プレビューに切り替わる。

横型の確定要件（ユーザー合意済み）:

- **統合方針**: デザイン選択肢として追加（縦型は従来どおり残す）
- **プレビュー**: 簡易（入力に応じた静的な完成イメージ。ドラッグ操作なし）
- **編集できる項目**: 名前 / @ハンドル / サイトURL / アクセント色（マスタード・コーラル）/
  写真あり・なし / QRあり・なし
  - サブタイトル2行「VRChat Creator / Unity Developer」は**固定文言**（今回は編集不可）
- **面数**: 表裏2ページ

横型の目玉機能: **サイトURLを入力すると、そのURLのQRとラベルを自動生成**する
（`x.com/mesukemo_ya` → QRは `https://x.com/mesukemo_ya`、下ラベルは `x.com`）。

> 縦型テンプレート（`card_builder.py` の `generate_pdf` 系）と、その既存フォーム項目・
> ライブプレビュー・ドラッグ操作には **一切手を加えない**。横型は完全に独立した経路として足す。

---

## 変更・新規対象ファイル

| ファイル | 区分 | 概要 |
|---|---|---|
| `print-card/generator/card_v5_builder.py` | **新規** | 横型の表裏2ページCMYK PDFビルダー（本書の付録コードをそのまま作成） |
| `print-card/generator/app.py` | 変更 | `template` 分岐と横型用 `/generate` 処理を追加 |
| `print-card/generator/templates/index.html` | 変更 | 冒頭に「デザイン選択」、横型専用フィールド一式、横型プレビューcanvasを追加 |
| `print-card/generator/static/generator.js` | 変更 | デザイン切り替えの表示制御＋横型の簡易プレビュー描画を追加 |
| `print-card/generator/print_assets.py` | 変更（軽微） | 横型が使う JP フォント（ZenMaruGothic-Bold）の存在保証のみ（後述） |
| `print-card/generator/pyinstaller.spec` | 変更（確認） | `card-logo.png` と ZenMaruGothic-Bold.ttf が同梱されることを確認（不足なら追加） |

---

## デザイン仕様（採寸・確定値）

座標系は「左上原点・mm」。ページ 97×61mm（トリム91×55mm＋塗り足し3mm）。
以下の値は制作済みPDFから採寸・検証済み。**付録コードが唯一の正**なので、
迷ったら付録コードの数値に従うこと。

### 配色（RGB→CMYK変換して使用）

| 用途 | RGB |
|---|---|
| 背景 | 6,10,20 |
| インフォカード地 | 12,21,43 |
| カード縁 | 34,48,82 |
| フレーム銀線 | 184,199,193 |
| 名前・和文（オフホワイト） | 236,236,228 |
| サブタイトル（ミュート） | 150,162,188 |
| QR白地 | 238,238,231 |
| アクセント mustard | 219,160,46 |
| アクセント coral | 233,91,92 |

### フォント

- ラテン文字（名前・サブタイトル・@ハンドル・URLラベル）: reportlab 内蔵 **Helvetica / Helvetica-Bold**（ダウンロード不要・ベクター）
- 裏面の和文「メスケモ推進委員会」「X @mesukemo_ya」: **ZenMaruGothic-Bold**（既存 `FONT_URLS` で取得済みのファイルを流用）

### 表面レイアウト要点

- 左：写真パネル（角丸矩形 x9.5,y9.5,w38,h42,r3.2）。写真は cover 配置（顔が出るよう上寄せ y_bias≈0.05）。写真なしは破線枠＋人物アイコン＋「PHOTO」のプレースホルダー。
- 右：インフォカード（角丸 x53,y19,w37.5,h33,r3.5、地=ネイビー）。右上に accent の同心アーク装飾。
- 名前（Helvetica-Bold 19pt）／アクセントバー（縦棒）＋サブタイトル2行（固定）／@ハンドル（accent 11pt）／URLラベル（accent、幅に応じ自動縮小・ドメインのみ→省略のフォールバック）。
- QR（あり時のみ）：白角丸ボックス 11mm、入力URLから生成。@ハンドルから接続線。
- 外周フレーム：銀の4本線＋角オーナメント（accent角丸四角×2／銀の輪郭円×2）。

### 裏面レイアウト要点

- 背景・フレームは表と共通。
- 左（x≈32中心）：白ロゴ（card-logo.png, 15mm）＋和文「メスケモ推進委員会」（ZenMaruGothic 12pt）＋accent区切り線＋「X @mesukemo_ya」（8pt）＋「mesukemo.uk」（accent 9pt）。
- 右：組織サイト（`https://mesukemo.uk` 固定）の大きめQR（26mm白ボックス）＋「SCAN ME」。

---

## URL → QR 自動生成の仕様

付録コードの `normalize_url` / `url_label` を使用。

- スキームが無ければ `https://` を補完してQR化（例: `mesukemo.uk` → `https://mesukemo.uk`）
- 表示ラベルは `https://`・`www.`・末尾スラッシュを除去（例: `https://x.com/mesukemo_ya` → `x.com/mesukemo_ya`）
- ラベルが QR 左端に被る場合は「ドメインのみ」へ短縮、それでも長ければ 6pt で末尾を「…」省略
  （QRには常に完全URLが入るのでラベルは可読性優先で構わない）
- 空URL時は組織サイト `https://mesukemo.uk` にフォールバック
- QRは `qrcode`（誤り訂正M、border=0）で生成 → CMYK JPEG化して配置

---

## print_assets.py の変更（軽微）

横型ビルダーは `LOGO`（既存: `images/card-logo.png`）と `FONTS/ZenMaruGothic-Bold.ttf`
（既存 `FONT_URLS` に含まれる）を使う。**新規アセットは不要**。
`card_v5_builder.py` 側から `download_fonts()` を呼べば ZenMaruGothic-Bold は保証されるため、
`print_assets.py` への追加は原則不要。もし import 整理が必要なら `LOGO`, `FONTS`,
`download_fonts` が公開されていることを確認するだけでよい。

---

## app.py の変更

`/generate`（POST）の冒頭で `template = request.form.get("template", "vertical")` を読む。

- `template != "pop"` → **現状の縦型処理をそのまま実行**（既存コードは変更しない）。
- `template == "pop"` → 横型処理に分岐:
  1. 取得: `name`（必須）, `x_handle`（必須, `normalize_x_handle` で正規化）,
     `url`（任意・空可）, `accent`（`{"mustard","coral"}`、既定 mustard）,
     `show_qr = request.form.get("pop_show_qr") is not None`,
     `use_photo = request.form.get("pop_use_photo") is not None`。
  2. 写真: `use_photo` かつ `photo` がアップロードされていれば一時保存してパスを渡す。
     `use_photo` が false または未アップロードなら `photo=None`（プレースホルダー）。
     → **写真は横型では任意**（縦型の「写真必須」バリデーションを横型に適用しないこと）。
  3. `card_v5_builder.generate_pop_pdf(output_path, accent_name=accent, photo=photo_path_or_None,
     show_qr=show_qr, url=url, name=name, x_handle=normalized_handle)` を呼ぶ。
  4. ダウンロード名は `meishi_pop_{safe_download_name(name)}_cmyk.pdf`。
  5. 一時ファイルのクリーンアップは既存 `/generate` と同じ流儀で行う。

エラーメッセージ（写真無し以外）・多言語の扱いは既存踏襲。横型のバリデーションは
name / x_handle の空チェックのみ。

---

## index.html の変更

1. `<h1>` 直後に **デザイン選択**の segmented-control を追加:
   - `name="template"` のラジオ2つ: `vertical`（既定・「縦型（従来）」）/ `pop`（「横型ポップ」）
   - hidden ではなく可視のラジオ。既存 `.segmented-control` のスタイルを流用。
2. 既存の縦型フィールド群（写真/フォント/追加画像/セリフ/名前・X ID/ロゴの各 `<details>`）を
   `<div id="verticalFields">` で包む。
3. 新規 `<div id="popFields" hidden>` を追加し、横型専用フィールドを置く（`.accordion-section` か
   単純な `label` 群で、既存スタイルに合わせる）:
   - 名前: `name="name"`（縦型と**同じ name 属性を共有**するため、縦型フィールドの `name` 入力とは
     id を分け、送信時にアクティブな方だけが有効になるようにする。実装が煩雑なら、横型用に
     `id="popNameInput"` を置き、送信直前に JS で値を hidden の `name` にコピーする方式でよい）
   - Xアカウント: 同様に `x_handle`
   - サイトURL: `name="url"` 新規（placeholder例 `mesukemo.uk`。空欄可＝組織サイトになる旨のhint）
   - アクセント色: `name="accent"` ラジオ（mustard/coral、既定mustard）
   - 写真を使う: `name="pop_use_photo"` チェックボックス（既定ON）＋ `type="file" name="photo"` 入力
     （※`photo` は縦型と共有。横型では任意）
   - QRを表示: `name="pop_show_qr"` チェックボックス（既定ON）
   - サブタイトルは固定のため入力欄なし（hintで「VRChat Creator / Unity Developer」固定と明記）
4. プレビュー領域:
   - 既存の縦型canvas（`#cardPreview`, aspect 61/97）はそのまま `#verticalFields` 側の相棒として残す。
   - 横型用に `<canvas id="popPreview">` を **aspect 97/61** の `.canvas-wrap` で追加（`#popFields` と対に）。
   - デザイン選択に応じて、対応するフィールド群＋プレビューのみ表示する。
5. 送信ボタン・ローディングUI（`#generateStatus` 等）は共通で流用。

---

## generator.js の変更（簡易プレビュー）

**既存の縦型プレビュー／ドラッグ処理には手を入れない。** 以下を追記する。

1. **デザイン切り替え**: `template` ラジオの `change` で
   `#verticalFields` と `#popFields`（＋各プレビューcanvasのラッパ）の表示/非表示を切り替える。
   `pop` 選択時のみ横型プレビューを再描画。
2. **横型簡易プレビュー** `drawPopPreview()`:
   - `#popPreview`（例: 内部解像度 970×610）に、表面レイアウトを**mm→pxスケール**（px = mm × 10）で描画。
   - 描く要素: 背景／写真パネル（写真ONならFileReaderで読み込んだ画像を cover、OFFなら
     プレースホルダーの枠＋アイコン＋「PHOTO」）／インフォカード／名前（入力値）／サブタイトル固定2行／
     @ハンドル（入力値・accent色）／URLラベル（`url_label`相当をJSで再現・自動縮小）／
     フレーム＋角オーナメント。
   - **QR**: 簡易プレビューでは QR ボックスの位置に白い角丸＋中央「QR」文字のプレースホルダーを描く
     （実QRはPDF側のみ。JSにQRライブラリは追加しない）。QRトグルOFF時は描かない。
   - accent色は mustard=`rgb(219,160,46)` / coral=`rgb(233,91,92)`。
   - 入力（名前・ハンドル・URL・色・写真ON/OFF・QR ON/OFF・写真ファイル）の変化で `drawPopPreview()` を再実行。
3. **送信ハンドリング**: 横型選択時、送信直前に横型用の入力値を対応する送信フィールド
   （`name`, `x_handle`, `url`, `accent`, `pop_use_photo`, `pop_show_qr`, `photo`）へ反映し、
   `template=pop` が送られるようにする。縦型選択時は従来どおり。

> 「簡易」の割り切り: 横型プレビューはドラッグ・微調整なし、QRはプレースホルダー表示。
> 位置指定用の hidden 群（`*_x_mm` 等）は横型では不要。

---

## 付録: `card_v5_builder.py`（新規作成・このまま作成する）

> パス定数のみ generator 環境向けに `print_assets` から解決する。描画ロジック・数値は検証済みなので変更しないこと。

```python
#!/usr/bin/env python3
"""横型ポップ名刺（card_v5_pop）ビルダー。表裏2ページのCMYK PDFを生成する。"""
from __future__ import annotations

import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import qrcode
from PIL import Image
from reportlab.lib.colors import CMYKColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from print_assets import FONTS, LOGO, download_fonts

LOGO_PATH = LOGO
JP_FONT_PATH = FONTS / "ZenMaruGothic-Bold.ttf"

PAGE_W_MM, PAGE_H_MM = 97.0, 61.0
PT = 72.0 / 25.4
ORG_URL = "https://mesukemo.uk"
ORG_X_HANDLE = "@mesukemo_ya"
SUBTITLE_LINES = ("VRChat Creator", "Unity Developer")  # 固定文言（将来編集可にするならここ）

FONT_BOLD = "Helvetica-Bold"
FONT_REG = "Helvetica"
JP_FONT = "ZenMaruGothic"
_jp_registered = False


def _ensure_jp_font():
    global _jp_registered
    if not _jp_registered:
        download_fonts()
        pdfmetrics.registerFont(TTFont(JP_FONT, str(JP_FONT_PATH)))
        _jp_registered = True


def mmpt(v: float) -> float:
    return v * PT


def rgb_to_cmyk(r, g, b):
    r, g, b = r / 255, g / 255, b / 255
    k = 1 - max(r, g, b)
    if k >= 1 - 1e-6:
        return CMYKColor(0, 0, 0, 1)
    return CMYKColor((1 - r - k) / (1 - k), (1 - g - k) / (1 - k), (1 - b - k) / (1 - k), k)


BG = rgb_to_cmyk(6, 10, 20)
NAVY = rgb_to_cmyk(12, 21, 43)
NAVY_BORDER = rgb_to_cmyk(34, 48, 82)
SILVER = rgb_to_cmyk(184, 199, 193)
OFFWHITE = rgb_to_cmyk(236, 236, 228)
SUBTITLE = rgb_to_cmyk(150, 162, 188)
WHITE = rgb_to_cmyk(238, 238, 231)
ACCENTS = {"mustard": rgb_to_cmyk(219, 160, 46), "coral": rgb_to_cmyk(233, 91, 92)}


def normalize_url(url: str) -> str:
    u = (url or "").strip()
    if not u:
        return ORG_URL
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", u):
        u = "https://" + u
    return u


def url_label(url: str) -> str:
    label = re.sub(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", "", (url or "").strip())
    label = re.sub(r"^www\.", "", label)
    return label.rstrip("/")


def _T(y_top_mm: float) -> float:
    return mmpt(PAGE_H_MM - y_top_mm)


def _rrect_path(c, x, y_top, w, h, r):
    x0, x1 = mmpt(x), mmpt(x + w)
    yb, yt, r = _T(y_top + h), _T(y_top), mmpt(r)
    p = c.beginPath()
    p.moveTo(x0 + r, yb)
    p.lineTo(x1 - r, yb)
    p.arcTo(x1 - 2 * r, yb, x1, yb + 2 * r, 270, 90)
    p.lineTo(x1, yt - r)
    p.arcTo(x1 - 2 * r, yt - 2 * r, x1, yt, 0, 90)
    p.lineTo(x0 + r, yt)
    p.arcTo(x0, yt - 2 * r, x0 + 2 * r, yt, 90, 90)
    p.lineTo(x0, yb + r)
    p.arcTo(x0, yb, x0 + 2 * r, yb + 2 * r, 180, 90)
    p.close()
    return p


def _cover_crop(im, target_w_mm, target_h_mm, x_bias=0.5, y_bias=0.5, dpi=600):
    tw = round(target_w_mm / 25.4 * dpi)
    th = round(target_h_mm / 25.4 * dpi)
    scale = max(tw / im.width, th / im.height)
    im2 = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    left = round((im2.width - tw) * x_bias)
    top = round((im2.height - th) * y_bias)
    return im2.crop((left, top, left + tw, top + th))


def _make_qr(text, px=900):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=0, box_size=10)
    qr.add_data(text)
    qr.make(fit=True)
    return qr.make_image(fill_color="black", back_color="white").convert("RGB").resize((px, px), Image.Resampling.NEAREST)


def _draw_frame(c, accent):
    c.setStrokeColor(SILVER)
    c.setLineWidth(mmpt(0.5))
    c.setLineCap(1)
    fx0, fy0, fx1, fy1 = 6.5, 6.5, 90.5, 54.5
    c.line(mmpt(12), _T(fy0), mmpt(85), _T(fy0))
    c.line(mmpt(12), _T(fy1), mmpt(85), _T(fy1))
    c.line(mmpt(fx0), _T(12), mmpt(fx0), _T(49))
    c.line(mmpt(fx1), _T(12), mmpt(fx1), _T(49))
    c.setFillColor(accent)
    sq = 3.0
    c.roundRect(mmpt(fx0 - sq / 2), _T(fy0 + sq / 2), mmpt(sq), mmpt(sq), mmpt(0.9), stroke=0, fill=1)
    c.roundRect(mmpt(fx1 - sq / 2), _T(fy1 + sq / 2), mmpt(sq), mmpt(sq), mmpt(0.9), stroke=0, fill=1)
    c.setStrokeColor(SILVER)
    c.setLineWidth(mmpt(0.45))
    c.circle(mmpt(fx1), _T(fy0), mmpt(1.6), stroke=1, fill=0)
    c.circle(mmpt(fx0), _T(fy1), mmpt(1.6), stroke=1, fill=0)


def _draw_photo_placeholder(c, px, py, pw, ph):
    c.setFillColor(rgb_to_cmyk(20, 30, 55))
    c.roundRect(mmpt(px), _T(py + ph), mmpt(pw), mmpt(ph), mmpt(3.2), stroke=0, fill=1)
    cx, cy = px + pw / 2, py + ph / 2
    c.saveState()
    c.setStrokeColor(rgb_to_cmyk(70, 84, 120))
    c.setLineWidth(mmpt(0.4))
    c.setDash(mmpt(1.6), mmpt(1.6))
    ins = 3.5
    c.roundRect(mmpt(px + ins), _T(py + ph - ins), mmpt(pw - 2 * ins), mmpt(ph - 2 * ins), mmpt(2.2), stroke=1, fill=0)
    c.restoreState()
    icon = rgb_to_cmyk(90, 104, 140)
    c.setFillColor(icon)
    c.circle(mmpt(cx), _T(cy - 2.5), mmpt(3.6), stroke=0, fill=1)
    c.roundRect(mmpt(cx - 5.5), _T(cy + 8.5), mmpt(11.0), mmpt(7.0), mmpt(3.5), stroke=0, fill=1)
    c.setFillColor(rgb_to_cmyk(120, 134, 168))
    c.setFont(FONT_BOLD, 7.5)
    c.drawCentredString(mmpt(cx), _T(cy + 17.0), "PHOTO")


def _draw_front(c, accent, photo, photo_ybias, show_qr, url, name, x_handle):
    site_label = url_label(url)
    c.setFillColor(BG)
    c.rect(0, 0, mmpt(PAGE_W_MM), mmpt(PAGE_H_MM), stroke=0, fill=1)

    px, py, pw, ph, pr = 9.5, 9.5, 38.0, 42.0, 3.2
    if photo is None:
        _draw_photo_placeholder(c, px, py, pw, ph)
    else:
        crop = _cover_crop(Image.open(photo).convert("RGB"), pw, ph, 0.52, photo_ybias)
        buf = io.BytesIO()
        crop.convert("CMYK").save(buf, "JPEG", quality=94, subsampling=0)
        buf.seek(0)
        c.saveState()
        c.clipPath(_rrect_path(c, px, py, pw, ph, pr), stroke=0, fill=0)
        c.drawImage(ImageReader(buf), mmpt(px), _T(py + ph), width=mmpt(pw), height=mmpt(ph))
        c.restoreState()
    c.setStrokeColor(NAVY_BORDER)
    c.setLineWidth(mmpt(0.4))
    c.roundRect(mmpt(px), _T(py + ph), mmpt(pw), mmpt(ph), mmpt(pr), stroke=1, fill=0)

    cx, cy, cw, ch, cr = 50.0, 19.0, 38.0, 33.0, 3.5
    c.setFillColor(NAVY)
    c.roundRect(mmpt(cx), _T(cy + ch), mmpt(cw), mmpt(ch), mmpt(cr), stroke=0, fill=1)
    c.saveState()
    c.clipPath(_rrect_path(c, cx, cy, cw, ch, cr), stroke=0, fill=0)
    for rad, lw, alpha in ((8.0, 0.5, 0.55), (11.0, 0.4, 0.35)):
        c.setStrokeColor(CMYKColor(accent.cyan, accent.magenta, accent.yellow, accent.black, alpha=alpha))
        c.setLineWidth(mmpt(lw))
        c.circle(mmpt(cx + cw), _T(cy), mmpt(rad), stroke=1, fill=0)
    c.restoreState()
    c.setStrokeColor(NAVY_BORDER)
    c.setLineWidth(mmpt(0.35))
    c.roundRect(mmpt(cx), _T(cy + ch), mmpt(cw), mmpt(ch), mmpt(cr), stroke=1, fill=0)

    name_x = 55.0
    c.setFillColor(OFFWHITE)
    c.setFont(FONT_BOLD, 19)
    c.drawString(mmpt(name_x), _T(28.0), name)
    c.setFillColor(accent)
    c.roundRect(mmpt(name_x), _T(39.5), mmpt(1.3), mmpt(9.0), mmpt(0.65), stroke=0, fill=1)
    sub_x = name_x + 3.0
    c.setFillColor(SUBTITLE)
    c.setFont(FONT_REG, 7.5)
    c.drawString(mmpt(sub_x), _T(33.6), SUBTITLE_LINES[0])
    c.drawString(mmpt(sub_x), _T(37.6), SUBTITLE_LINES[1])
    c.setFillColor(accent)
    c.setFont(FONT_BOLD, 11)
    c.drawString(mmpt(name_x), _T(44.0), x_handle)
    handle_w = c.stringWidth(x_handle, FONT_BOLD, 11)
    qx, qy, qs, qpad = 75.0, 39.5, 11.0, 0.9
    if show_qr:
        c.setStrokeColor(accent)
        c.setLineWidth(mmpt(0.5))
        c.line(mmpt(name_x) + handle_w + mmpt(1.5), _T(43.2), mmpt(qx), _T(43.2))

    c.setFillColor(accent)
    label_max_mm = (qx - 1.5) - name_x if show_qr else (90.5 - 3.0) - name_x

    def _fit(text, mx=8.0, mn=6.0):
        s = mx
        while s > mn and c.stringWidth(text, FONT_BOLD, s) > mmpt(label_max_mm):
            s -= 0.25
        return (text, s) if c.stringWidth(text, FONT_BOLD, s) <= mmpt(label_max_mm) else None

    host = site_label.split("/")[0]
    chosen = _fit(site_label) or _fit(host)
    if chosen is None:
        t = host
        while t and c.stringWidth(t + "…", FONT_BOLD, 6.0) > mmpt(label_max_mm):
            t = t[:-1]
        chosen = ((t + "…") if t else site_label, 6.0)
    c.setFont(FONT_BOLD, chosen[1])
    c.drawString(mmpt(name_x), _T(49.2), chosen[0])

    if show_qr:
        c.setFillColor(WHITE)
        c.roundRect(mmpt(qx), _T(qy + qs), mmpt(qs), mmpt(qs), mmpt(1.4), stroke=0, fill=1)
        qb = io.BytesIO()
        _make_qr(url).convert("CMYK").save(qb, "JPEG", quality=95, subsampling=0)
        qb.seek(0)
        inner = qs - qpad * 2
        c.drawImage(ImageReader(qb), mmpt(qx + qpad), _T(qy + qpad + inner), width=mmpt(inner), height=mmpt(inner))

    _draw_frame(c, accent)


def _draw_back(c, accent):
    _ensure_jp_font()
    c.setFillColor(BG)
    c.rect(0, 0, mmpt(PAGE_W_MM), mmpt(PAGE_H_MM), stroke=0, fill=1)
    lx = 32.0
    logo = Image.open(LOGO_PATH).convert("RGBA")
    lsz = 15.0
    lb = io.BytesIO()
    logo.save(lb, "PNG")
    lb.seek(0)
    c.drawImage(ImageReader(lb), mmpt(lx - lsz / 2), _T(15.0 + lsz), width=mmpt(lsz), height=mmpt(lsz), mask="auto")
    c.setFillColor(OFFWHITE)
    c.setFont(JP_FONT, 12)
    c.drawCentredString(mmpt(lx), _T(35.0), "メスケモ推進委員会")
    c.setStrokeColor(accent)
    c.setLineWidth(mmpt(0.5))
    c.setLineCap(1)
    c.line(mmpt(lx - 14), _T(39.5), mmpt(lx + 14), _T(39.5))
    c.setFillColor(OFFWHITE)
    c.setFont(JP_FONT, 8)
    c.drawCentredString(mmpt(lx), _T(45.0), "X  " + ORG_X_HANDLE)
    c.setFillColor(accent)
    c.setFont(FONT_BOLD, 9)
    c.drawCentredString(mmpt(lx), _T(50.5), url_label(ORG_URL))
    qs, qx = 25.0, 61.0
    qy = (PAGE_H_MM - qs) / 2
    c.setFillColor(WHITE)
    c.roundRect(mmpt(qx), _T(qy + qs), mmpt(qs), mmpt(qs), mmpt(2.0), stroke=0, fill=1)
    qb = io.BytesIO()
    _make_qr(ORG_URL).convert("CMYK").save(qb, "JPEG", quality=95, subsampling=0)
    qb.seek(0)
    pad = 2.0
    c.drawImage(ImageReader(qb), mmpt(qx + pad), _T(qy + pad + qs - 2 * pad), width=mmpt(qs - 2 * pad), height=mmpt(qs - 2 * pad))
    c.setFillColor(SUBTITLE)
    c.setFont(FONT_BOLD, 6.5)
    c.drawCentredString(mmpt(qx + qs / 2), _T(qy + qs + 4.5), "SCAN ME")
    _draw_frame(c, accent)


def generate_pop_pdf(out_path, accent_name="mustard", photo=None, show_qr=True,
                     url=ORG_URL, name="Yuuya", x_handle="@yuuya", photo_ybias=0.05):
    accent = ACCENTS.get(accent_name, ACCENTS["mustard"])
    url = normalize_url(url)
    page = (mmpt(PAGE_W_MM), mmpt(PAGE_H_MM))
    c = canvas.Canvas(str(out_path), pagesize=page, pageCompression=1)
    c.setTitle("メスケモ推進委員会 名刺 card_v5_pop")
    _draw_front(c, accent, (Path(photo) if photo else None), photo_ybias, show_qr, url, name, x_handle)
    c.showPage()
    _draw_back(c, accent)
    c.showPage()
    c.save()
    return out_path
```

---

## 追記：パステル背景スタイルの追加（実装済み）

横型に「スタイル選択」を追加し、以下3スタイルを切替可能にした（実装・検証済み）。

- `pop`（既存ダークネイビー）：`accent`（mustard/coral）あり
- `pastel_slot`：支給背景 `pop_bg_slot`（左ゴールド枠スロットに写真を cover）
- `pastel_transparent`：支給背景 `pop_bg_transparent`（透過PNGキャラを左寄り・下揃えで重ねる）

### アセット
- `print-card/assets/pop_bg_slot_cmyk.jpg` / `pop_bg_transparent_cmyk.jpg`（PDF埋め込み用CMYK）
- `print-card/generator/static/pop_bg_slot.png` / `pop_bg_transparent.png`（プレビュー用RGB）
- いずれも `pyinstaller.spec` の `assets/` `static/` ディレクトリ同梱に含まれるため spec 変更不要。

### card_v5_builder.py
- 配色 `INK / INK2 / GOLD / GOLD_LOGO_RGB / PWHITE` を追加。
- `generate_pop_pdf(..., style="pop"|"pastel_slot"|"pastel_transparent", ...)` に `style` 引数追加。
- パステルは `_draw_pastel_front`（背景＋写真/透過＋右余白テキスト＋QR）＋ `_draw_pastel_back`
  （transparent背景を流用し、金着色ロゴ＋和文＋@mesukemo_ya＋mesukemo.uk＋中央QR）。
- 文字は右余白 `nx=53mm` に濃色＋金、QRは右下 `qx=74,qy=39,qs=11.5`。QR ON/OFF・URL自動生成は共通。
- ロゴ着色は numpy 不使用（PIL の `getchannel("A")`＋`putalpha`）で依存を増やさない。

### app.py / index.html / generator.js
- `_generate_pop`：`pop_style` を読み `generate_pop_pdf(style=...)` へ。パステルでも写真は任意。
- フォーム：`popFields` 先頭に `name="pop_style"` の3択。`accent` 行はダークネイビー時のみ表示、
  透過キャラ選択時は「透過PNG推奨」の注意書きを表示。
- プレビュー：`drawDark`（既存）と `drawPastel(style)` を `drawPopPreview` で振り分け。
  パステル背景は `/static/pop_bg_*.png` を Image で読み込み canvas に描画。

### 注意
- パステルの名前・@ハンドルも英字フォント（Helvetica）。日本語名は非対応。
- 透過キャラは利用者が「背景透明PNG」を用意する前提（自動背景除去はしない）。
- 配布 `.exe` はWindows側でのみビルド可（WSL/Linuxからはクロスビルド不可）。

## セルフチェック（Codex 実装後）

1. デザイン選択で「縦型（従来）」を選ぶと、**従来の縦型ジェネレーターが完全に従来どおり**動く
   （フィールド・ライブプレビュー・ドラッグ・生成PDFが以前と同一）。
2. 「横型ポップ」を選ぶと、横型フィールドと横型プレビューに切り替わる。
3. 横型プレビューが、名前・@ハンドル・URLラベル・色・写真ON/OFF・QR ON/OFF の変更に追従する。
4. 横型で「CMYK PDFを生成」→ **表裏2ページ・97×61mm・CMYK** のPDFがダウンロードされる。
5. 生成PDF表面のQRが、入力URLをスキャン結果として返す（`x.com/mesukemo_ya`→`https://x.com/mesukemo_ya`）。
   空URLなら組織サイト。裏面QRは常に `https://mesukemo.uk`。
   （OpenCV `QRCodeDetector` でデコード確認可能）
6. 写真OFF時は表面左が「PHOTO」プレースホルダーになる。写真ON＋未選択でもエラーで落ちず
   プレースホルダーで生成される。
7. QR OFF時は表面QRと接続線が消え、URLラベルは残る。
8. mustard / coral の両方で表裏の差し色が正しく変わる。
9. PyInstaller ビルド（frozen）でも `card-logo.png` と ZenMaruGothic-Bold.ttf が解決でき、
   横型PDFが生成できる。
10. `npm run format` 等は不要（Python/HTML/JS）。既存の縦型テスト観点にリグレッションが無いこと。
```
