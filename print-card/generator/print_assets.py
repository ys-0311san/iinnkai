#!/usr/bin/env python3
"""名刺ジェネレーター専用の軽量アセット定義。

build.py / generate_background.py の重い依存（weasyprint, opencv）を
importチェーンに巻き込まないよう、名刺ジェネレーターが実際に使う定数・関数だけを
ここに複製する。build.py / generate_background.py 側は変更しない。
"""
from __future__ import annotations

import math
import sys
import urllib.request
from pathlib import Path

import pikepdf
import qrcode
from PIL import Image, ImageDraw
from fontTools.ttLib import TTFont as FontToolsTTFont
from fontTools.varLib import instancer

if getattr(sys, "frozen", False):
    # PyInstaller (--onefile) でビルドされた場合、バンドルされたデータは
    # 一時展開ディレクトリ sys._MEIPASS 以下に "print_bundle/" というプレフィックスで置く
    # （pyinstaller.spec の datas 設定と対応させる）
    BASE_DIR = Path(sys._MEIPASS) / "print_bundle"  # type: ignore[attr-defined]
    ROOT = BASE_DIR  # ここでの ROOT は「print-card/」相当のバンドル内ディレクトリ
    REPO_ROOT = BASE_DIR  # images/ もこの下にバンドルする
else:
    ROOT = Path(__file__).resolve().parents[1]  # print-card/
    REPO_ROOT = ROOT.parent
ASSETS = ROOT / "assets"
FONTS = ROOT / "fonts"
LOGO = REPO_ROOT / "images" / "card-logo.png"
GENERATOR_DIR = (Path(sys._MEIPASS) / "print_bundle" / "generator") if getattr(sys, "frozen", False) else Path(__file__).resolve().parent  # type: ignore[attr-defined]
TEMPLATES_DIR = GENERATOR_DIR / "templates"
STATIC_DIR = GENERATOR_DIR / "static"

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
