#!/usr/bin/env python3
from __future__ import annotations

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
from PIL import Image
from pypdf import PdfReader
from reportlab.lib.colors import CMYKColor
from reportlab.lib.pagesizes import landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from weasyprint import HTML

from generate_background import build_backgrounds


ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
OUTPUT = ROOT / "output"
ASSETS = ROOT / "assets"
FONTS = ROOT / "fonts"

PAGE_MM = (61.0, 97.0)
FINISH_MM = (55.0, 91.0)
SAFE_MM = (49.0, 85.0)
LOGO_DISPLAY_MM = 24.0
BACK_BANNER_DISPLAY_MM = 34.0
MIN_EFFECTIVE_DPI = 350.0
QR_URL = "https://mesukemo.uk"
PREVIEW_DPI = 350

FONT_URLS = {
    "NotoSerifJP-Regular.otf": "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Serif/OTF/Japanese/NotoSerifCJKjp-Regular.otf",
    "NotoSerifJP-Bold.otf": "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Serif/OTF/Japanese/NotoSerifCJKjp-Bold.otf",
    "NotoSerifJP.ttf": "https://github.com/google/fonts/raw/main/ofl/notoserifjp/NotoSerifJP%5Bwght%5D.ttf",
    "ZenMaruGothic-Regular.ttf": "https://github.com/google/fonts/raw/main/ofl/zenmarugothic/ZenMaruGothic-Regular.ttf",
    "ZenMaruGothic-Bold.ttf": "https://github.com/google/fonts/raw/main/ofl/zenmarugothic/ZenMaruGothic-Bold.ttf",
    "ZenKakuGothicNew-Bold.ttf": "https://github.com/google/fonts/raw/main/ofl/zenkakugothicnew/ZenKakuGothicNew-Bold.ttf",
    "KaiseiDecol-Bold.ttf": "https://github.com/google/fonts/raw/main/ofl/kaiseidecol/KaiseiDecol-Bold.ttf",
    "YujiSyuku-Regular.ttf": "https://github.com/google/fonts/raw/main/ofl/yujisyuku/YujiSyuku-Regular.ttf",
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


def build_background() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    build_backgrounds()

    Image.open(ASSETS / "qr-mesukemo.png").convert("CMYK").save(ASSETS / "qr-mesukemo-cmyk.jpg", quality=95)
    Image.open(ASSETS / "header-banner-clean.png").convert("CMYK").save(
        ASSETS / "header-banner-cmyk.jpg", quality=96, subsampling=0
    )


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

    offwhite = CMYKColor(0.0, 0.0, 0.035, 0.04)
    gold = CMYKColor(0.05, 0.12, 0.45, 0.0)

    c.drawImage(str(ASSETS / "card-bg-front-cmyk.jpg"), 0, 0, width=page_w, height=page_h)

    name = "yuki__san"
    name_size = 12.0
    signature_right = mm_to_pt(6.0)
    signature_bottom = mm_to_pt(6.0)
    signature_x = page_w - signature_right
    name_y = signature_bottom
    name_w = pdfmetrics.stringWidth(name, "NotoSerifJP", name_size)
    name_x = signature_x - name_w
    c.setFont("NotoSerifJP", name_size)
    c.setFillColor(CMYKColor(0.0, 0.0, 0.0, 0.92, alpha=0.72))
    c.drawString(name_x + mm_to_pt(0.28), name_y - mm_to_pt(0.32), name)
    c.setFillColor(CMYKColor(0.0, 0.0, 0.0, 0.0, alpha=0.22))
    c.drawString(name_x - mm_to_pt(0.12), name_y + mm_to_pt(0.14), name)
    c.setFillColor(offwhite)
    c.drawString(name_x, name_y, name)

    handle = "@shumiaka_yuki"
    handle_size = 7.0
    handle_y = name_y + mm_to_pt(5.5)
    handle_w = pdfmetrics.stringWidth(handle, "NotoSerifJP", handle_size)
    handle_x = signature_x - handle_w
    c.setFont("NotoSerifJP", handle_size)
    c.setFillColor(CMYKColor(0.0, 0.0, 0.0, 0.92, alpha=0.72))
    c.drawString(handle_x + mm_to_pt(0.2), handle_y - mm_to_pt(0.24), handle)
    c.setFillColor(CMYKColor(0.0, 0.0, 0.0, 0.0, alpha=0.22))
    c.drawString(handle_x - mm_to_pt(0.1), handle_y + mm_to_pt(0.1), handle)
    c.setFillColor(offwhite)
    c.drawString(handle_x, handle_y, handle)

    c.showPage()

    c.drawImage(str(ASSETS / "card-bg-back-cmyk.jpg"), 0, 0, width=page_w, height=page_h)

    back_banner_w = mm_to_pt(BACK_BANNER_DISPLAY_MM)
    back_banner_h = back_banner_w * 179.0 / 960.0
    back_banner_center_y = page_h - mm_to_pt(37.5)
    c.drawImage(
        str(ASSETS / "header-banner-cmyk.jpg"),
        (page_w - back_banner_w) / 2,
        back_banner_center_y - back_banner_h / 2,
        width=back_banner_w,
        height=back_banner_h,
    )

    link_label_size = 6.5
    c.setFont("ZenMaruGothic", link_label_size)
    c.setFillColor(gold)
    c.drawCentredString(page_w / 2, page_h - mm_to_pt(53.5), "<LINK>")

    link_size = 8.0
    link = "X  @mesukemo_ya"
    c.setFont("ZenMaruGothic", link_size)
    c.setFillColor(offwhite)
    c.drawCentredString(page_w / 2, page_h - mm_to_pt(57.0), link)

    website_label_size = 6.0
    c.setFont("ZenMaruGothic", website_label_size)
    c.setFillColor(gold)
    c.drawCentredString(page_w / 2, page_h - mm_to_pt(60.2), "<WEBSITE>")

    qr_box_size = mm_to_pt(27.0)
    qr_padding = mm_to_pt(1.0)
    qr_x = (page_w - qr_box_size) / 2
    qr_y = mm_to_pt(8.0)
    c.setFillColor(offwhite)
    c.rect(qr_x, qr_y, qr_box_size, qr_box_size, stroke=0, fill=1)
    qr_size = qr_box_size - qr_padding * 2
    c.drawImage(
        str(ASSETS / "qr-mesukemo-cmyk.jpg"),
        qr_x + qr_padding,
        qr_y + qr_padding,
        width=qr_size,
        height=qr_size,
    )

    c.showPage()
    c.save()
    remove_unused_reportlab_default_font(cmyk_pdf)
    return cmyk_pdf


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


def write_preview(cmyk_pdf: Path) -> tuple[Path, Path]:
    previews = (
        OUTPUT / "meishi_mesukemo_preview_front.png",
        OUTPUT / "meishi_mesukemo_preview_back.png",
    )
    old_preview = OUTPUT / "meishi_mesukemo_preview.png"
    if old_preview.exists():
        old_preview.unlink()
    gs = shutil.which("gs") or shutil.which("gswin64c") or shutil.which("gswin32c")
    if gs:
        for page_number, preview in enumerate(previews, start=1):
            run(
                [
                    gs,
                    "-dSAFER",
                    "-dBATCH",
                    "-dNOPAUSE",
                    "-sDEVICE=png16m",
                    "-r350",
                    f"-dFirstPage={page_number}",
                    f"-dLastPage={page_number}",
                    f"-sOutputFile={preview}",
                    str(cmyk_pdf),
                ]
            )
        return previews

    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError("Ghostscript was not found. Install `pymupdf` to render the preview fallback.") from exc

    doc = fitz.open(str(cmyk_pdf))
    for page_index, preview in enumerate(previews):
        pix = doc[page_index].get_pixmap(matrix=fitz.Matrix(PREVIEW_DPI / 72.0, PREVIEW_DPI / 72.0), alpha=False)
        pix.save(str(preview))
    return previews


def check_page_size(pdf_path: Path) -> None:
    reader = PdfReader(str(pdf_path))
    if len(reader.pages) != 2:
        raise RuntimeError(f"{pdf_path.name} must be 2 pages, got {len(reader.pages)}.")
    for index, page in enumerate(reader.pages, start=1):
        box = page.mediabox
        width_mm = float(box.width) / 72.0 * 25.4
        height_mm = float(box.height) / 72.0 * 25.4
        if abs(width_mm - PAGE_MM[0]) > 0.05 or abs(height_mm - PAGE_MM[1]) > 0.05:
            raise RuntimeError(
                f"{pdf_path.name} page {index} size is {width_mm:.2f}x{height_mm:.2f}mm, expected 61x97mm."
            )
        print(f"{pdf_path.name} page {index} size: {width_mm:.2f} x {height_mm:.2f} mm")


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
