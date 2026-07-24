# 名刺ジェネレーター（print-card/generator/）— 依存関係の軽量化（.exe化の準備）

## 背景・目的

`print-card/generator/` をPyInstallerで単一.exe化して他メンバーに配布したい。しかし現状 `card_builder.py` は
`build.py` / `generate_background.py` から `from ... import (...)` の形で読み込んでおり、これらのモジュールは
**トップレベルで** `weasyprint`（`build.py`）・`cv2`＝opencv（`generate_background.py`）を import している。
Pythonの `from module import name` はモジュール全体のトップレベルコードを実行してからでないと属性を取り出せないため、
名刺ジェネレーター自体はweasyprint/opencvの機能を一切使っていないにもかかわらず、これらの重い依存が
importチェーン上どうしても付いてきてしまい、.exeが不必要に巨大・低速になる。

**`print-card/build.py` と `print-card/generate_background.py` は一切変更しないこと**（既存の名刺印刷パイプライン用で、
今回のタスクの対象外）。代わりに、`card_builder.py` が実際に使っている名前だけを洗い出し、それらを新しい
軽量モジュールに複製し、`card_builder.py`側の import 元をそちらに切り替える。

---

## 1. 実際の使用状況（調査済み）

`card_builder.py` の既存importブロック:

```python
from build import (  # noqa: E402
    ASSETS,
    BACK_BANNER_DISPLAY_MM,
    FONTS,
    QR_URL,
    build_qr,
    download_fonts,
    mm_to_pt,
    remove_unused_reportlab_default_font,
)

from generate_background import (  # noqa: E402
    HEIGHT,
    LOGO,
    PAGE_MM,
    WIDTH,
    add_bottom_scrim,
    color_grade_wood,
    cover_image,
    draw_frame,
    draw_gradient_rect,
    draw_kumiko,
    foil_color,
    make_common_background,
    mirror_tile,
    mm,
    save_rgb_and_cmyk,
)
```

`grep` で実使用箇所を確認した結果、**以下8つは import されているだけで一切使われていない**（削除してよい）:
`color_grade_wood`, `draw_frame`, `draw_gradient_rect`, `draw_kumiko`, `foil_color`, `make_common_background`, `mirror_tile`, `save_rgb_and_cmyk`

残り（`ASSETS`, `BACK_BANNER_DISPLAY_MM`, `FONTS`, `QR_URL`, `build_qr`, `download_fonts`, `mm_to_pt`, `remove_unused_reportlab_default_font`, `HEIGHT`, `LOGO`, `PAGE_MM`, `WIDTH`, `add_bottom_scrim`, `cover_image`, `mm`）は実際に使われているので、複製が必要。

---

## 2. 新規ファイル `print-card/generator/print_assets.py`

`build.py`・`generate_background.py`とは独立した、軽量依存だけの新規モジュールを作成する。
**import は `pathlib`, `math`, `PIL`（Image, ImageDraw）, `pikepdf`, `fontTools`（ttLib, varLib.instancer）, `urllib.request`, `qrcode` のみ**とし、
`weasyprint` と `cv2` は一切importしないこと。

```python
#!/usr/bin/env python3
"""名刺ジェネレーター専用の軽量アセット定義。

build.py / generate_background.py の重い依存（weasyprint, opencv）を
importチェーンに巻き込まないよう、名刺ジェネレーターが実際に使う定数・関数だけを
ここに複製する。build.py / generate_background.py 側は変更しない。
"""
from __future__ import annotations

import math
import urllib.request
from pathlib import Path

import pikepdf
import qrcode
from PIL import Image, ImageDraw
from fontTools.ttLib import TTFont as FontToolsTTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[1]  # print-card/
REPO_ROOT = ROOT.parent
ASSETS = ROOT / "assets"
FONTS = ROOT / "fonts"
LOGO = REPO_ROOT / "images" / "card-logo.png"

PAGE_MM = (61.0, 97.0)
DPI = 635
SCALE = DPI / 25.4
WIDTH = round(PAGE_MM[0] / 25.4 * DPI)
HEIGHT = round(PAGE_MM[1] / 25.4 * DPI)

QR_URL = "https://mesukemo.uk"
BACK_BANNER_DISPLAY_MM = 34.0

# card_builder.py の FONT_PRESETS が実際に使うフォントのみ（NotoSerifJPは可変フォントなので
# Bold単体ファイルが無く、fontToolsでBoldウェイトをインスタンス化する必要がある）
FONT_URLS = {
    "NotoSerifJP.ttf": "https://github.com/google/fonts/raw/main/ofl/notoserifjp/NotoSerifJP%5Bwght%5D.ttf",
    "ZenMaruGothic-Bold.ttf": "https://github.com/google/fonts/raw/main/ofl/zenmarugothic/ZenMaruGothic-Bold.ttf",
    "ZenKakuGothicNew-Bold.ttf": "https://github.com/google/fonts/raw/main/ofl/zenkakugothicnew/ZenKakuGothicNew-Bold.ttf",
    "KaiseiDecol-Bold.ttf": "https://github.com/google/fonts/raw/main/ofl/kaiseidecol/KaiseiDecol-Bold.ttf",
    "YujiSyuku-Regular.ttf": "https://github.com/google/fonts/raw/main/ofl/yujisyuku/YujiSyuku-Regular.ttf",
}


def mm(value: float) -> int:
    return round(value * SCALE)


def mm_to_pt(value: float) -> float:
    return value / 25.4 * 72.0


def download_fonts() -> None:
    FONTS.mkdir(parents=True, exist_ok=True)
    for filename, url in FONT_URLS.items():
        dest = FONTS / filename
        if dest.exists() and dest.stat().st_size > 0:
            continue
        urllib.request.urlretrieve(url, dest)
    bold_ttf = FONTS / "NotoSerifJP-Bold.ttf"
    if not bold_ttf.exists():
        variable_font = FontToolsTTFont(str(FONTS / "NotoSerifJP.ttf"))
        bold_font = instancer.instantiateVariableFont(
            variable_font, {"wght": 700}, inplace=False, updateFontNames=True
        )
        bold_font.save(str(bold_ttf))


def build_qr() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=24,
        border=2,
    )
    qr.add_data(QR_URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#2f211b", back_color="#f5f3ed").convert("RGB")
    img.save(ASSETS / "qr-mesukemo.png")


def cover_image(source: Image.Image, size: tuple[int, int], x_bias: float = 0.38, y_bias: float = 0.0) -> Image.Image:
    target_w, target_h = size
    scale = max(target_w / source.width, target_h / source.height)
    resized_w = math.ceil(source.width * scale)
    resized_h = math.ceil(source.height * scale)
    resized = source.resize((resized_w, resized_h), Image.Resampling.LANCZOS)
    max_x = max(0, resized_w - target_w)
    max_y = max(0, resized_h - target_h)
    left = round(max_x * x_bias)
    top = round(max_y * y_bias)
    return resized.crop((left, top, left + target_w, top + target_h))


def add_bottom_scrim(img: Image.Image) -> None:
    scrim_h = mm(19.0)
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    top = img.height - scrim_h
    for y in range(top, img.height):
        t = (y - top) / max(1, scrim_h - 1)
        alpha = round((t**1.4) * 178)
        draw.line([(0, y), (img.width, y)], fill=(0, 0, 0, alpha))
    img.alpha_composite(overlay)


def remove_unused_reportlab_default_font(pdf_path: Path) -> None:
    pdf = pikepdf.Pdf.open(str(pdf_path), allow_overwriting_input=True)
    for page in pdf.pages:
        content = page.Contents.read_bytes()
        content = content.replace(b"BT /F1 12 Tf 14.4 TL ET\n", b"")
        page.Contents = pdf.make_stream(content)
        fonts = page.Resources.get("/Font", {})
        if "/F1" in fonts and b"/F1 " not in content:
            del fonts["/F1"]
    pdf.save(str(pdf_path))
```

**注意**: `mm()`, `mm_to_pt()`, `cover_image()`, `add_bottom_scrim()`, `remove_unused_reportlab_default_font()`,
`download_fonts()` の中身のロジックは、`build.py`/`generate_background.py` の元実装と**完全に同一の計算結果**になるように
一字一句正確にコピーすること（数値や計算式を変えない。変数名変更もしない）。`ASSETS`/`FONTS`のパスも、
`build.py`側の `ROOT / "assets"` / `ROOT / "fonts"`（`ROOT` = `print-card/`）と**同じ物理ディレクトリ**を指すようにすること
（`print_assets.py` は `print-card/generator/print_assets.py` に置くので、`ROOT = Path(__file__).resolve().parents[1]` で
`print-card/` を指すようにする）。

---

## 3. `card_builder.py` の import 修正

既存の2ブロックの import を、以下1ブロックに置き換える:

```python
from print_assets import (
    ASSETS,
    BACK_BANNER_DISPLAY_MM,
    FONTS,
    HEIGHT,
    LOGO,
    PAGE_MM,
    QR_URL,
    WIDTH,
    add_bottom_scrim,
    build_qr,
    cover_image,
    download_fonts,
    mm,
    mm_to_pt,
    remove_unused_reportlab_default_font,
)
```

（未使用だった8つの名前は取り込まない。`card_builder.py`本体のロジック・関数・クラスには一切手を加えない）

`_ensure_assets()` 内の以下の部分（バックグラウンド画像が無い場合のフォールバック生成）:
```python
if not (ASSETS / "card-bg-back-cmyk.jpg").exists() or not (ASSETS / "header-banner-cmyk.jpg").exists():
    from generate_background import build_backgrounds
    build_backgrounds()
    ...
```
この部分（`generate_background.build_backgrounds` の**関数内ローカルimport**）はそのまま残してよい
（cv2は関数が実際に呼ばれたときだけ読み込まれる遅延importなので、通常運用でアセットが既に存在する限り実行されず問題にならない）。

---

## 4. `app.py` の import 修正

```python
from build import download_fonts
```
を
```python
from print_assets import download_fonts
```
に変更する。他のimport（`card_builder`から`FONT_PRESETS`, `DEFAULT_FONT_KEY`, `generate_pdf`等）はそのまま。

---

## 5. 動作確認の観点

1. `python -c "import sys; sys.path.insert(0,'generator'); import card_builder; print('cv2' in sys.modules, 'weasyprint' in sys.modules)"` を実行し、**両方とも `False`** になること（重い依存が一切読み込まれていないことの確認）
2. 既存の `generate_pdf()` の統合テスト（写真回転・明度・追加画像・フォントプリセット・セリフ空を含む）が、この変更後も**全く同じ結果**でエラーなく通ること
3. `python -m py_compile generator/print_assets.py generator/card_builder.py generator/app.py` が通ること
4. `print-card/build.py` と `print-card/generate_background.py` の内容が**1文字も変更されていない**こと（`git diff --stat` で確認）
5. Flaskサーバーを起動し、`http://localhost:5000/` からPDF生成が引き続き正常に動作すること（回帰確認）
