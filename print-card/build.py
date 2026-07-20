#!/usr/bin/env python3
from __future__ import annotations

import math
import os
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

import qrcode
import pikepdf
from fontTools.ttLib import TTFont as FontToolsTTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw
from pypdf import PdfReader
from reportlab.lib.colors import CMYKColor
from reportlab.lib.pagesizes import landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from weasyprint import HTML


ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
OUTPUT = ROOT / "output"
ASSETS = ROOT / "assets"
FONTS = ROOT / "fonts"

PAGE_MM = (97.0, 61.0)
FINISH_MM = (91.0, 55.0)
SAFE_MM = (85.0, 49.0)
LOGO_DISPLAY_MM = 20.0
MIN_EFFECTIVE_DPI = 350.0
QR_URL = "https://mesukemo.uk"
PREVIEW_DPI = 350

FONT_URLS = {
    "NotoSerifJP-Regular.otf": "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Serif/OTF/Japanese/NotoSerifCJKjp-Regular.otf",
    "NotoSerifJP-Bold.otf": "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Serif/OTF/Japanese/NotoSerifCJKjp-Bold.otf",
    "NotoSerifJP.ttf": "https://github.com/google/fonts/raw/main/ofl/notoserifjp/NotoSerifJP%5Bwght%5D.ttf",
    "ZenMaruGothic-Regular.ttf": "https://github.com/google/fonts/raw/main/ofl/zenmarugothic/ZenMaruGothic-Regular.ttf",
    "ZenMaruGothic-Bold.ttf": "https://github.com/google/fonts/raw/main/ofl/zenmarugothic/ZenMaruGothic-Bold.ttf",
}


def mm_to_pt(mm: float) -> float:
    return mm / 25.4 * 72.0


def run(cmd: list[str]) -> None:
    print("+ " + " ".join(cmd))
    subprocess.run(cmd, check=True)


def download_fonts() -> None:
    FONTS.mkdir(parents=True, exist_ok=True)
    for filename, url in FONT_URLS.items():
        dest = FONTS / filename
        if dest.exists() and dest.stat().st_size > 0:
            continue
        print(f"Downloading {filename}")
        urllib.request.urlretrieve(url, dest)
    bold_ttf = FONTS / "NotoSerifJP-Bold.ttf"
    if not bold_ttf.exists():
        variable_font = FontToolsTTFont(str(FONTS / "NotoSerifJP.ttf"))
        bold_font = instancer.instantiateVariableFont(variable_font, {"wght": 700}, inplace=False)
        bold_font.save(str(bold_ttf))


def build_qr() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=24,
        border=4,
    )
    qr.add_data(QR_URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#2f211b", back_color="#f5f3ed").convert("RGB")
    img.save(ASSETS / "qr-mesukemo.png")


def build_background() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    width = round(PAGE_MM[0] / 25.4 * PREVIEW_DPI)
    height = round(PAGE_MM[1] / 25.4 * PREVIEW_DPI)
    scale = PREVIEW_DPI / 25.4
    img = Image.new("RGB", (width, height), "#8b6f47")
    draw = ImageDraw.Draw(img)

    for x in range(width):
        wave = int(9 * math.sin(x / 23.0) + 5 * math.sin(x / 71.0))
        color = (139 + wave, 111 + wave // 2, 71 + wave // 3)
        draw.line([(x, 0), (x, height)], fill=color)

    for y in range(0, height, max(1, round(0.55 * scale))):
        shade = 10 if (y // max(1, round(1.1 * scale))) % 2 else -6
        draw.line([(0, y), (width, y)], fill=(139 + shade, 111 + shade, 71 + shade // 2))

    border = round(3.0 * scale)
    gold = round(0.55 * scale)
    inner = round(4.6 * scale)
    inner_gold = max(1, round(0.35 * scale))
    draw.rectangle([0, 0, width - 1, height - 1], outline="#5c4033", width=border)
    draw.rectangle(
        [border, border, width - border - 1, height - border - 1],
        outline="#d4af37",
        width=gold,
    )
    draw.rectangle(
        [inner, inner, width - inner - 1, height - inner - 1],
        outline="#d4af37",
        width=inner_gold,
    )
    img.save(ASSETS / "card-bg.png")

    logo = Image.open(REPO_ROOT / "images" / "card-logo.png").convert("RGBA")
    logo_px = round(LOGO_DISPLAY_MM / 25.4 * PREVIEW_DPI)
    logo = logo.resize((logo_px, logo_px), Image.Resampling.LANCZOS)
    logo_x = round(6.0 * scale)
    logo_y = round(6.0 * scale)
    bg_with_logo = img.convert("RGBA")
    bg_with_logo.alpha_composite(logo, (logo_x, logo_y))
    bg_with_logo.convert("CMYK").save(ASSETS / "card-bg-logo-cmyk.jpg", quality=95)

    Image.open(ASSETS / "qr-mesukemo.png").convert("CMYK").save(ASSETS / "qr-mesukemo-cmyk.jpg", quality=95)


def check_logo_dpi() -> float:
    logo_path = REPO_ROOT / "images" / "card-logo.png"
    with Image.open(logo_path) as img:
        px = min(img.size)
    effective_dpi = px / (LOGO_DISPLAY_MM / 25.4)
    if effective_dpi < MIN_EFFECTIVE_DPI:
        print(
            f"WARNING: logo effective dpi is {effective_dpi:.1f}, "
            f"below {MIN_EFFECTIVE_DPI:.0f} dpi at {LOGO_DISPLAY_MM:.1f}mm."
        )
    else:
        print(f"Logo effective dpi: {effective_dpi:.1f} at {LOGO_DISPLAY_MM:.1f}mm.")
    return effective_dpi


def write_rgb_pdf() -> Path:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    rgb_pdf = OUTPUT / "meishi_mesukemo_rgb.pdf"
    HTML(filename=str(ROOT / "card.html"), base_url=str(ROOT)).write_pdf(str(rgb_pdf))
    return rgb_pdf


def convert_to_cmyk(rgb_pdf: Path) -> Path:
    cmyk_pdf = OUTPUT / "meishi_mesukemo_cmyk.pdf"
    gs = shutil.which("gs") or shutil.which("gswin64c") or shutil.which("gswin32c")
    if not gs:
        raise RuntimeError(
            "Ghostscript is required for CMYK conversion. Install `ghostscript` and rerun this script."
        )

    cmd = [
        gs,
        "-dSAFER",
        "-dBATCH",
        "-dNOPAUSE",
        "-dPDFSTOPONERROR",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.6",
        "-dProcessColorModel=/DeviceCMYK",
        "-sColorConversionStrategy=CMYK",
        "-sColorConversionStrategyForImages=CMYK",
        "-dOverrideICC",
        "-dEmbedAllFonts=true",
        "-dSubsetFonts=true",
        f"-sOutputFile={cmyk_pdf}",
        str(rgb_pdf),
    ]

    icc = find_japan_color_profile()
    if icc:
        cmd.insert(-2, f"-sOutputICCProfile={icc}")
        print(f"Using ICC profile: {icc}")
    else:
        print("WARNING: Japan Color 2001 Coated ICC profile was not found; using Ghostscript CMYK conversion defaults.")

    run(cmd)
    return cmyk_pdf


def write_cmyk_pdf_direct() -> Path:
    cmyk_pdf = OUTPUT / "meishi_mesukemo_cmyk.pdf"
    page_w = mm_to_pt(PAGE_MM[0])
    page_h = mm_to_pt(PAGE_MM[1])

    pdfmetrics.registerFont(TTFont("NotoSerifJP", str(FONTS / "NotoSerifJP-Bold.ttf")))
    pdfmetrics.registerFont(TTFont("ZenMaruGothic", str(FONTS / "ZenMaruGothic-Bold.ttf")))

    c = canvas.Canvas(str(cmyk_pdf), pagesize=(page_w, page_h), pageCompression=1)
    c.setTitle("メスケモ推進委員会 名刺")
    c.drawImage(str(ASSETS / "card-bg-logo-cmyk.jpg"), 0, 0, width=page_w, height=page_h)

    offwhite = CMYKColor(0.0, 0.0, 0.035, 0.04)
    gold = CMYKColor(0.0, 0.18, 0.74, 0.17)

    left_x = mm_to_pt(30.0)
    c.setFillColor(offwhite)
    c.setFont("NotoSerifJP", 12.5)
    c.drawString(left_x, page_h - mm_to_pt(12.8), "メスケモ推進委員会")
    c.setFillColor(gold)
    c.setFont("ZenMaruGothic", 7.4)
    c.drawString(left_x, page_h - mm_to_pt(17.2), "mesukemo.uk")

    c.setFillColor(offwhite)
    c.setFont("NotoSerifJP", 17.2)
    c.drawString(mm_to_pt(6.0), page_h - mm_to_pt(48.0), "yuki__san")

    right_edge = mm_to_pt(91.0)
    c.setFont("ZenMaruGothic", 6.7)
    for idx, (label, value) in enumerate([("X", "@mesukemo_ya")]):
        y = page_h - mm_to_pt(9.4 + idx * 4.1)
        value_w = pdfmetrics.stringWidth(value, "ZenMaruGothic", 6.7)
        label_w = pdfmetrics.stringWidth(label, "ZenMaruGothic", 6.7)
        c.setFillColor(gold)
        c.drawString(right_edge - value_w - label_w - mm_to_pt(1.2), y, label)
        c.setFillColor(offwhite)
        c.drawString(right_edge - value_w, y, value)

    qr_size = mm_to_pt(22.0)
    c.drawImage(
        str(ASSETS / "qr-mesukemo-cmyk.jpg"),
        mm_to_pt(69.0),
        page_h - mm_to_pt(55.0),
        width=qr_size,
        height=qr_size,
    )

    c.showPage()
    c.save()
    remove_unused_reportlab_default_font(cmyk_pdf)
    return cmyk_pdf


def remove_unused_reportlab_default_font(pdf_path: Path) -> None:
    pdf = pikepdf.Pdf.open(str(pdf_path), allow_overwriting_input=True)
    page = pdf.pages[0]
    content = page.Contents.read_bytes()
    content = content.replace(b"BT /F1 12 Tf 14.4 TL ET\n", b"")
    page.Contents = pdf.make_stream(content)
    fonts = page.Resources.get("/Font", {})
    if "/F1" in fonts and b"/F1 " not in content:
        del fonts["/F1"]
    pdf.save(str(pdf_path))


def find_japan_color_profile() -> str | None:
    candidates = []
    for base in [
        Path("/usr/share/color"),
        Path("/usr/local/share/color"),
        Path.home() / ".local/share/color",
        ROOT / "icc",
    ]:
        if base.exists():
            candidates.extend(base.rglob("*.icc"))
            candidates.extend(base.rglob("*.icm"))
    for path in candidates:
        normalized = path.name.lower().replace(" ", "").replace("_", "")
        if "japancolor2001coated" in normalized:
            return str(path)
    return None


def write_preview(cmyk_pdf: Path) -> Path:
    preview = OUTPUT / "meishi_mesukemo_preview.png"
    gs = shutil.which("gs") or shutil.which("gswin64c") or shutil.which("gswin32c")
    if not gs:
        raise RuntimeError("Ghostscript is required to render the preview from the CMYK PDF.")
    run(
        [
            gs,
            "-dSAFER",
            "-dBATCH",
            "-dNOPAUSE",
            "-sDEVICE=png16m",
            "-r350",
            f"-sOutputFile={preview}",
            str(cmyk_pdf),
        ]
    )
    return preview


def check_page_size(pdf_path: Path) -> None:
    reader = PdfReader(str(pdf_path))
    if len(reader.pages) != 1:
        raise RuntimeError(f"{pdf_path.name} must be 1 page, got {len(reader.pages)}.")
    box = reader.pages[0].mediabox
    width_mm = float(box.width) / 72.0 * 25.4
    height_mm = float(box.height) / 72.0 * 25.4
    if abs(width_mm - PAGE_MM[0]) > 0.05 or abs(height_mm - PAGE_MM[1]) > 0.05:
        raise RuntimeError(f"{pdf_path.name} page size is {width_mm:.2f}x{height_mm:.2f}mm, expected 97x61mm.")
    print(f"{pdf_path.name} page size: {width_mm:.2f} x {height_mm:.2f} mm")


def main() -> int:
    os.chdir(ROOT)
    print(f"Page: {PAGE_MM[0]:.0f}x{PAGE_MM[1]:.0f}mm, finish: {FINISH_MM[0]:.0f}x{FINISH_MM[1]:.0f}mm, safe: {SAFE_MM[0]:.0f}x{SAFE_MM[1]:.0f}mm")
    download_fonts()
    build_qr()
    build_background()
    check_logo_dpi()
    rgb_pdf = write_rgb_pdf()
    check_page_size(rgb_pdf)
    # Ghostscript 10.02 can drop WeasyPrint text in some environments. Keep
    # WeasyPrint for the RGB proof, and write the production PDF directly with
    # CMYK colors and embedded fonts.
    cmyk_pdf = write_cmyk_pdf_direct()
    check_page_size(cmyk_pdf)
    write_preview(cmyk_pdf)
    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
