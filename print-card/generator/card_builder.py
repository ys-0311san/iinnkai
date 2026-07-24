#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
import tempfile
import math
import threading
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont
from reportlab.lib.colors import CMYKColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from print_assets import (  # noqa: E402
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


SAFE_MARGIN = mm(6.0)
TEXT_SAFE_MARGIN_MM = 5.0
NAME_FONT_SIZE_PT = 12.0
NAME_TEXT_HEIGHT_MM = 4.9
EXTRA_BASE_MM = 22.0
FONT_PRESETS = {
    "noto-serif-jp": {"file": "NotoSerifJP-Bold.ttf", "pdf_name": "NotoSerifJP"},
    "zen-maru-gothic": {"file": "ZenMaruGothic-Bold.ttf", "pdf_name": "ZenMaruGothic"},
    "zen-kaku-gothic-new": {"file": "ZenKakuGothicNew-Bold.ttf", "pdf_name": "ZenKakuGothicNew"},
    "kaisei-decol": {"file": "KaiseiDecol-Bold.ttf", "pdf_name": "KaiseiDecol"},
    "yuji-syuku": {"file": "YujiSyuku-Regular.ttf", "pdf_name": "YujiSyuku"},
}
DEFAULT_FONT_KEY = "noto-serif-jp"
_PRESET_FONTS_REGISTERED = False
_PRESET_FONTS_REGISTER_LOCK = threading.Lock()


def _ensure_assets() -> None:
    download_fonts()
    if not (ASSETS / "qr-mesukemo-cmyk.jpg").exists():
        build_qr()
        Image.open(ASSETS / "qr-mesukemo.png").convert("CMYK").save(
            ASSETS / "qr-mesukemo-cmyk.jpg", quality=95
        )
    if not (ASSETS / "card-bg-back-cmyk.jpg").exists() or not (ASSETS / "header-banner-cmyk.jpg").exists():
        from generate_background import build_backgrounds

        build_backgrounds()
        if (ASSETS / "header-banner-clean.png").exists():
            Image.open(ASSETS / "header-banner-clean.png").convert("CMYK").save(
                ASSETS / "header-banner-cmyk.jpg", quality=96, subsampling=0
            )


def _catchphrase_lines(text: str) -> list[str]:
    compact = re.sub(r"\s+", "", text)
    if not compact:
        return []

    if "、" in compact or "。" in compact:
        parts = re.findall(r"[^、。]+[、。]?", compact)
        return [part for part in parts if part]

    return [compact[i : i + 6] for i in range(0, len(compact), 6)]


def _resolve_font_key(font_key: str | None) -> str:
    return font_key if font_key in FONT_PRESETS else DEFAULT_FONT_KEY


def _font_file_path(font_key: str) -> Path:
    return FONTS / FONT_PRESETS[_resolve_font_key(font_key)]["file"]


def _font_pdf_name(font_key: str) -> str:
    return FONT_PRESETS[_resolve_font_key(font_key)]["pdf_name"]


def _register_all_preset_fonts() -> None:
    for preset in FONT_PRESETS.values():
        pdfmetrics.registerFont(TTFont(preset["pdf_name"], str(FONTS / preset["file"])))


def _ensure_preset_fonts_registered() -> None:
    global _PRESET_FONTS_REGISTERED
    if _PRESET_FONTS_REGISTERED:
        return
    with _PRESET_FONTS_REGISTER_LOCK:
        if _PRESET_FONTS_REGISTERED:
            return
        download_fonts()
        _register_all_preset_fonts()
        _PRESET_FONTS_REGISTERED = True


_ensure_preset_fonts_registered()


def _load_catchphrase_font(size: int, font_path: Path | None = None) -> ImageFont.FreeTypeFont:
    selected_path = font_path or _font_file_path(DEFAULT_FONT_KEY)
    try:
        return ImageFont.truetype(str(selected_path), size=size)
    except Exception:
        return ImageFont.truetype(str(_font_file_path(DEFAULT_FONT_KEY)), size=size)


def _clamp(value: float, minimum: float, maximum: float) -> float:
    if maximum < minimum:
        return minimum
    return min(maximum, max(minimum, value))


def _clamp_text_box_mm(pos_mm: tuple[float, float], width_mm: float, height_mm: float) -> tuple[float, float]:
    x_mm, y_mm = pos_mm
    return (
        _clamp(x_mm, TEXT_SAFE_MARGIN_MM, PAGE_MM[0] - TEXT_SAFE_MARGIN_MM - width_mm),
        _clamp(y_mm, TEXT_SAFE_MARGIN_MM, PAGE_MM[1] - TEXT_SAFE_MARGIN_MM - height_mm),
    )


def _clamp_rotation_deg(rotation_deg: float) -> float:
    return _clamp(rotation_deg, -45.0, 45.0)


def _clamp_photo_rotation_deg(rotation_deg: float) -> float:
    return _clamp(rotation_deg, -15.0, 15.0)


def _clamp_factor(value: float, minimum: float, maximum: float) -> float:
    return _clamp(value, minimum, maximum)


def _draw_extra_images(front: Image.Image, extra_images: list[dict | None]) -> None:
    for extra in extra_images:
        if extra is None:
            continue
        scale_factor = _clamp_factor(float(extra.get("scale_factor", 1.0)), 0.3, 2.5)
        rotation_deg = _clamp(float(extra.get("rotation_deg", 0.0)), -180.0, 180.0)
        with Image.open(extra["path"]) as source:
            img = source.convert("RGBA")
        contain_px = mm(EXTRA_BASE_MM * scale_factor)
        ratio = min(contain_px / img.width, contain_px / img.height)
        w = max(1, round(img.width * ratio))
        h = max(1, round(img.height * ratio))
        resized = img.resize((w, h), Image.Resampling.LANCZOS)
        # PIL rotates counter-clockwise for positive values; Canvas rotates
        # clockwise in screen coordinates, so invert the sign to match preview.
        rotated = resized.rotate(-rotation_deg, expand=True, resample=Image.Resampling.BICUBIC)
        cx = mm(float(extra.get("x_mm", PAGE_MM[0] / 2)))
        cy = mm(float(extra.get("y_mm", PAGE_MM[1] / 2)))
        paste_x = round(cx - rotated.width / 2)
        paste_y = round(cy - rotated.height / 2)
        front.alpha_composite(rotated, (paste_x, paste_y))


def _rotated_aabb_half_mm(width_mm: float, height_mm: float, rotation_deg: float) -> tuple[float, float]:
    theta = math.radians(rotation_deg)
    half_w = (width_mm / 2) * abs(math.cos(theta)) + (height_mm / 2) * abs(math.sin(theta))
    half_h = (width_mm / 2) * abs(math.sin(theta)) + (height_mm / 2) * abs(math.cos(theta))
    return half_w, half_h


def _clamp_text_center_mm(
    center_mm: tuple[float, float],
    width_mm: float,
    height_mm: float,
    rotation_deg: float,
) -> tuple[float, float]:
    half_w, half_h = _rotated_aabb_half_mm(width_mm, height_mm, rotation_deg)
    min_x = TEXT_SAFE_MARGIN_MM + half_w
    max_x = PAGE_MM[0] - TEXT_SAFE_MARGIN_MM - half_w
    min_y = TEXT_SAFE_MARGIN_MM + half_h
    max_y = PAGE_MM[1] - TEXT_SAFE_MARGIN_MM - half_h
    return (
        PAGE_MM[0] / 2 if max_x < min_x else _clamp(center_mm[0], min_x, max_x),
        PAGE_MM[1] / 2 if max_y < min_y else _clamp(center_mm[1], min_y, max_y),
    )


def _measure_horizontal(
    lines: list[str], font_size: int, font_path: Path | None
) -> tuple[int, int, int]:
    font = _load_catchphrase_font(font_size, font_path)
    scratch = Image.new("RGBA", (1, 1))
    draw = ImageDraw.Draw(scratch)
    line_gap = max(mm(1.5), round(font_size * 0.36))
    line_widths = [
        bbox[2] - bbox[0]
        for bbox in (draw.textbbox((0, 0), line, font=font) for line in lines)
    ]
    total_w = max(line_widths)
    total_h = len(lines) * font_size + (len(lines) - 1) * line_gap
    return line_gap, total_w, total_h


def _catchphrase_metrics(
    text: str,
    orientation: str = "vertical",
    size_factor: float = 1.0,
    font_path: Path | None = None,
    rotation_deg: float = 0.0,
) -> tuple[list[str], int, int, int, int, int]:
    lines = _catchphrase_lines(text)
    if not lines:
        return [], 0, 0, 0, 0, 0

    orientation = "horizontal" if orientation == "horizontal" else "vertical"
    size_factor = _clamp_factor(size_factor, 0.6, 1.8)
    rotation_deg = _clamp_rotation_deg(rotation_deg)
    max_height = HEIGHT - SAFE_MARGIN * 2
    max_width = WIDTH - SAFE_MARGIN * 2

    if orientation == "horizontal":
        line_count = len(lines)
        font_size = mm(7.2)
        while font_size > mm(4.0):
            line_gap, total_w, total_h = _measure_horizontal(lines, font_size, font_path)
            if total_w <= max_width * 0.82 and total_h <= max_height * 0.45:
                break
            font_size -= mm(0.25)

        font_size = max(1, round(font_size * size_factor))
        char_step = 0
        line_gap, total_w, total_h = _measure_horizontal(lines, font_size, font_path)
    else:
        max_chars = max(len(line) for line in lines)
        line_count = len(lines)
        font_size = min(mm(7.2), max(mm(4.2), round(max_height / max(max_chars, 1) * 0.82)))
        line_gap = mm(2.0)

        while font_size > mm(4.0):
            char_step = round(font_size * 1.06)
            total_w = line_count * font_size + (line_count - 1) * line_gap
            total_h = max_chars * char_step
            if total_w <= max_width * 0.48 and total_h <= max_height:
                break
            font_size -= mm(0.25)

        font_size = max(1, round(font_size * size_factor))
        char_step = round(font_size * 1.06)
        line_gap = max(mm(1.5), round(font_size * 0.36))
        total_w = line_count * font_size + (line_count - 1) * line_gap
        total_h = max_chars * char_step

    # Safety net: whatever the user requested (size_factor, rotation, or an
    # unbreakably long line), the rotated bounding box must still fit inside
    # the 5mm safe area. Shrink the font down further if it doesn't, rather
    # than trusting the caller-side clamp (which can only move the block, not
    # resize it) to keep it on the page.
    max_half_w_mm = (PAGE_MM[0] - 2 * TEXT_SAFE_MARGIN_MM) / 2
    max_half_h_mm = (PAGE_MM[1] - 2 * TEXT_SAFE_MARGIN_MM) / 2
    half_w_mm, half_h_mm = _rotated_aabb_half_mm(total_w / mm(1.0), total_h / mm(1.0), rotation_deg)
    shrink = 1.0
    if half_w_mm > 0:
        shrink = min(shrink, max_half_w_mm / half_w_mm)
    if half_h_mm > 0:
        shrink = min(shrink, max_half_h_mm / half_h_mm)
    if shrink < 1.0:
        font_size = max(1, round(font_size * shrink * 0.98))
        if orientation == "horizontal":
            line_gap, total_w, total_h = _measure_horizontal(lines, font_size, font_path)
        else:
            char_step = round(font_size * 1.06)
            line_gap = max(mm(1.5), round(font_size * 0.36))
            total_w = line_count * font_size + (line_count - 1) * line_gap
            total_h = max_chars * char_step

    return lines, font_size, char_step, line_gap, total_w, total_h


def _default_catchphrase_center_px(total_w: int, total_h: int) -> tuple[int, int]:
    start_x = min(WIDTH - SAFE_MARGIN - total_w, mm(24.5))
    start_x = max(SAFE_MARGIN, start_x)
    start_y = mm(14.0)
    if start_y + total_h > HEIGHT - SAFE_MARGIN:
        start_y = SAFE_MARGIN
    return start_x + total_w // 2, start_y + total_h // 2


def _clamp_catchphrase_pos_mm(
    text: str,
    pos_mm: tuple[float, float],
    orientation: str = "vertical",
    rotation_deg: float = 0.0,
    size_factor: float = 1.0,
    font_path: Path | None = None,
) -> tuple[float, float]:
    _lines, _font_size, _char_step, _line_gap, total_w, total_h = _catchphrase_metrics(
        text,
        orientation=orientation,
        size_factor=size_factor,
        font_path=font_path,
        rotation_deg=rotation_deg,
    )
    if not total_w or not total_h:
        return pos_mm
    return _clamp_text_center_mm(pos_mm, total_w / mm(1.0), total_h / mm(1.0), rotation_deg)


def draw_catchphrase(
    img: Image.Image,
    text: str,
    pos_mm: tuple[float, float] | None = None,
    orientation: str = "vertical",
    rotation_deg: float = 0.0,
    size_factor: float = 1.0,
    stroke_factor: float = 1.0,
    fill_color: str = "white",
    font_path: Path | None = None,
) -> None:
    orientation = "horizontal" if orientation == "horizontal" else "vertical"
    rotation_deg = _clamp_rotation_deg(rotation_deg)
    size_factor = _clamp_factor(size_factor, 0.6, 1.8)
    stroke_factor = _clamp_factor(stroke_factor, 0.0, 2.0)
    fill_color = "black" if fill_color == "black" else "white"
    lines, font_size, char_step, line_gap, total_w, total_h = _catchphrase_metrics(
        text,
        orientation=orientation,
        size_factor=size_factor,
        font_path=font_path,
        rotation_deg=rotation_deg,
    )
    if not lines:
        return

    width_mm = total_w / mm(1.0)
    height_mm = total_h / mm(1.0)
    if pos_mm is None:
        center_x, center_y = _default_catchphrase_center_px(total_w, total_h)
    else:
        clamped_x_mm, clamped_y_mm = _clamp_text_center_mm(pos_mm, width_mm, height_mm, rotation_deg)
        center_x = mm(clamped_x_mm)
        center_y = mm(clamped_y_mm)

    stroke_width = round(mm(0.26) * stroke_factor)
    pad = stroke_width + 3
    block = Image.new("RGBA", (max(1, total_w + pad * 2), max(1, total_h + pad * 2)), (0, 0, 0, 0))
    font = _load_catchphrase_font(font_size, font_path)
    draw = ImageDraw.Draw(block)
    fill = (0, 0, 0, 240) if fill_color == "black" else (255, 252, 242, 245)
    stroke_fill = (255, 252, 242, 230) if fill_color == "black" else (0, 0, 0, 190)

    if orientation == "horizontal":
        for line_index, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=font, stroke_width=stroke_width)
            line_w = bbox[2] - bbox[0]
            x = pad + (total_w - line_w) / 2 - bbox[0]
            y = pad + line_index * (font_size + line_gap) - bbox[1]
            draw.text(
                (x, y),
                line,
                font=font,
                fill=fill,
                stroke_width=stroke_width,
                stroke_fill=stroke_fill,
            )
    else:
        line_count = len(lines)
        for line_index, line in enumerate(lines):
            x = round(pad + (line_count - 1 - line_index) * (font_size + line_gap))
            for char_index, char in enumerate(line):
                y = pad + char_index * char_step
                bbox = draw.textbbox((0, 0), char, font=font, stroke_width=stroke_width)
                char_w = bbox[2] - bbox[0]
                draw.text(
                    (x + (font_size - char_w) / 2 - bbox[0], y - bbox[1]),
                    char,
                    font=font,
                    fill=fill,
                    stroke_width=stroke_width,
                    stroke_fill=stroke_fill,
                )

    rotated = block.rotate(-rotation_deg, expand=True, resample=Image.Resampling.BICUBIC)
    paste_x = round(center_x - rotated.width / 2)
    paste_y = round(center_y - rotated.height / 2)
    img.alpha_composite(rotated, (paste_x, paste_y))


def draw_vertical_catchphrase(
    img: Image.Image,
    text: str,
    pos_mm: tuple[float, float] | None = None,
) -> None:
    draw_catchphrase(img, text, pos_mm=pos_mm, orientation="vertical")


def _required_cover_size(target_w: float, target_h: float, rotation_deg: float) -> tuple[float, float]:
    theta = math.radians(rotation_deg)
    req_w = abs(target_w * math.cos(theta)) + abs(target_h * math.sin(theta))
    req_h = abs(target_w * math.sin(theta)) + abs(target_h * math.cos(theta))
    return req_w, req_h


def _cover_image_with_offset(
    source: Image.Image,
    size: tuple[int, int],
    offset_mm: tuple[float, float] | None = None,
    scale_factor: float = 1.0,
    rotation_deg: float = 0.0,
    brightness_factor: float = 1.0,
) -> Image.Image:
    rotation_deg = _clamp_photo_rotation_deg(rotation_deg)
    if brightness_factor != 1.0:
        source = ImageEnhance.Brightness(source).enhance(brightness_factor)

    if offset_mm is None:
        if rotation_deg == 0.0:
            return cover_image(source, size, x_bias=0.5, y_bias=0.3)
        target_w, target_h = size
        req_w, req_h = _required_cover_size(target_w, target_h, rotation_deg)
        base_scale = max(req_w / source.width, req_h / source.height)
        scaled_w = source.width * base_scale
        scaled_h = source.height * base_scale
        left = -(scaled_w - target_w) * 0.5
        top = -(scaled_h - target_h) * 0.3
        offset_mm = (left / mm(1.0), top / mm(1.0))

    # photo_offset_*_mm is the resized cover image's top-left point, measured
    # from the card's top-left in page millimeters. Negative values mean the
    # image extends beyond the trim area. scale_factor is a multiplier on top
    # of the base "cover" scale (1.0 = just covers the page, matching the
    # browser preview's zoom slider which starts at 100%).
    target_w, target_h = size
    theta = math.radians(rotation_deg)
    req_w, req_h = _required_cover_size(target_w, target_h, rotation_deg)
    base_scale = max(req_w / source.width, req_h / source.height)
    scale = base_scale * max(1.0, scale_factor)
    resized_w = math.ceil(source.width * scale)
    resized_h = math.ceil(source.height * scale)
    resized = source.resize((resized_w, resized_h), Image.Resampling.LANCZOS)
    req_left = target_w / 2 + req_w / 2 - resized_w
    req_right = target_w / 2 - req_w / 2
    req_top = target_h / 2 + req_h / 2 - resized_h
    req_bottom = target_h / 2 - req_h / 2
    left = _clamp(mm(offset_mm[0]), req_left, req_right)
    top = _clamp(mm(offset_mm[1]), req_top, req_bottom)

    if rotation_deg == 0.0:
        front = Image.new("RGB", size)
        front.paste(resized, (round(left), round(top)))
        return front

    cos_t, sin_t = math.cos(theta), math.sin(theta)
    cw, ch = target_w / 2, target_h / 2
    a, b = cos_t, sin_t
    c = cw * (1 - cos_t) - sin_t * ch - left
    d, e = -sin_t, cos_t
    f = sin_t * cw + ch * (1 - cos_t) - top

    return resized.transform(
        size,
        Image.AFFINE,
        (a, b, c, d, e, f),
        resample=Image.Resampling.BICUBIC,
        fillcolor=(0, 0, 0),
    )


def build_custom_front(
    photo_path: Path,
    catchphrase: str,
    name: str,
    x_handle: str,
    photo_offset: tuple[float, float] | None = None,
    catchphrase_pos_mm: tuple[float, float] | None = None,
    catchphrase_orientation: str = "vertical",
    catchphrase_rotation_deg: float = 0.0,
    catchphrase_size_factor: float = 1.0,
    catchphrase_stroke_factor: float = 1.0,
    catchphrase_fill_color: str = "white",
    catchphrase_font_path: Path | None = None,
    photo_scale: float = 1.0,
    photo_rotation_deg: float = 0.0,
    photo_brightness_factor: float = 1.0,
    show_logo: bool = True,
    extra_images: list[dict | None] | None = None,
) -> Image.Image:
    photo = Image.open(photo_path).convert("RGB")
    front = _cover_image_with_offset(
        photo,
        (WIDTH, HEIGHT),
        photo_offset,
        photo_scale,
        rotation_deg=photo_rotation_deg,
        brightness_factor=photo_brightness_factor,
    ).convert("RGBA")
    add_bottom_scrim(front)
    _draw_extra_images(front, extra_images or [])
    draw_catchphrase(
        front,
        catchphrase,
        catchphrase_pos_mm,
        orientation=catchphrase_orientation,
        rotation_deg=catchphrase_rotation_deg,
        size_factor=catchphrase_size_factor,
        stroke_factor=catchphrase_stroke_factor,
        fill_color=catchphrase_fill_color,
        font_path=catchphrase_font_path,
    )

    if show_logo:
        logo_size = mm(14.0)
        logo = Image.open(LOGO).convert("RGBA")
        logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        alpha = logo.getchannel("A").point(lambda value: round(value * 0.75))
        logo.putalpha(alpha)
        front.alpha_composite(logo, (mm(6.0), HEIGHT - mm(6.0) - logo_size))
    return front


def _clamp_name_pos_mm(
    name: str,
    pos_mm: tuple[float, float],
    font_name: str = "NotoSerifJP",
    size_factor: float = 1.0,
) -> tuple[float, float]:
    name_w_mm = pdfmetrics.stringWidth(name, font_name, NAME_FONT_SIZE_PT * size_factor) / mm_to_pt(1.0)
    return _clamp_text_box_mm(pos_mm, name_w_mm, NAME_TEXT_HEIGHT_MM * size_factor)


def _draw_front_signature(
    c: canvas.Canvas,
    page_w: float,
    page_h: float,
    name: str,
    x_handle: str,
    name_pos_mm: tuple[float, float] | None = None,
    font_name: str = "NotoSerifJP",
    size_factor: float = 1.0,
) -> None:
    offwhite = CMYKColor(0.0, 0.0, 0.035, 0.04)

    name_size = NAME_FONT_SIZE_PT * size_factor
    signature_right = mm_to_pt(6.0)
    signature_bottom = mm_to_pt(6.0)
    name_w = pdfmetrics.stringWidth(name, font_name, name_size)
    if name_pos_mm is None:
        signature_x = page_w - signature_right
        name_y = signature_bottom
        name_x = signature_x - name_w
    else:
        name_x_mm, name_y_mm = _clamp_name_pos_mm(name, name_pos_mm, font_name, size_factor)
        name_x = mm_to_pt(name_x_mm)
        name_y = page_h - mm_to_pt(name_y_mm + NAME_TEXT_HEIGHT_MM * size_factor)
        signature_x = name_x + name_w
    c.setFont(font_name, name_size)
    c.setFillColor(CMYKColor(0.0, 0.0, 0.0, 0.92, alpha=0.72))
    c.drawString(name_x + mm_to_pt(0.28), name_y - mm_to_pt(0.32), name)
    c.setFillColor(CMYKColor(0.0, 0.0, 0.0, 0.0, alpha=0.22))
    c.drawString(name_x - mm_to_pt(0.12), name_y + mm_to_pt(0.14), name)
    c.setFillColor(offwhite)
    c.drawString(name_x, name_y, name)

    handle_size = 7.0 * size_factor
    handle_y = name_y + mm_to_pt(5.5 * size_factor)
    handle_w = pdfmetrics.stringWidth(x_handle, font_name, handle_size)
    handle_x = signature_x - handle_w
    c.setFont(font_name, handle_size)
    c.setFillColor(CMYKColor(0.0, 0.0, 0.0, 0.92, alpha=0.72))
    c.drawString(handle_x + mm_to_pt(0.2), handle_y - mm_to_pt(0.24), x_handle)
    c.setFillColor(CMYKColor(0.0, 0.0, 0.0, 0.0, alpha=0.22))
    c.drawString(handle_x - mm_to_pt(0.1), handle_y + mm_to_pt(0.1), x_handle)
    c.setFillColor(offwhite)
    c.drawString(handle_x, handle_y, x_handle)


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


def _draw_back(c: canvas.Canvas, page_w: float, page_h: float) -> None:
    offwhite = CMYKColor(0.0, 0.0, 0.035, 0.04)
    gold = CMYKColor(0.08, 0.28, 0.75, 0.10)

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

    _draw_engraved_centered_text(c, page_w / 2, page_h - mm_to_pt(53.5), "<LINK>", "ZenMaruGothic", 6.5, gold)

    c.setFont("ZenMaruGothic", 8.0)
    c.setFillColor(offwhite)
    c.drawCentredString(page_w / 2, page_h - mm_to_pt(57.0), "X  @mesukemo_ya")

    _draw_engraved_centered_text(c, page_w / 2, page_h - mm_to_pt(60.2), "<WEBSITE>", "ZenMaruGothic", 6.0, gold)

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


def normalize_x_handle(x_handle: str) -> str:
    handle = x_handle.strip()
    if not handle.startswith("@"):
        handle = f"@{handle}"
    return handle


def safe_download_name(name: str) -> str:
    safe = re.sub(r"[^\w.@+-]+", "_", name.strip(), flags=re.UNICODE).strip("_")
    return safe or "custom"


def generate_pdf(
    photo_path: Path,
    catchphrase: str,
    name: str,
    x_handle: str,
    output_path: Path,
    photo_offset: tuple[float, float] | None = None,
    name_pos_mm: tuple[float, float] | None = None,
    catchphrase_pos_mm: tuple[float, float] | None = None,
    catchphrase_orientation: str = "vertical",
    catchphrase_rotation_deg: float = 0.0,
    catchphrase_size_factor: float = 1.0,
    catchphrase_stroke_factor: float = 1.0,
    catchphrase_fill_color: str = "white",
    catchphrase_font_key: str = DEFAULT_FONT_KEY,
    name_font_key: str = DEFAULT_FONT_KEY,
    name_size_factor: float = 1.0,
    photo_scale: float = 1.0,
    photo_rotation_deg: float = 0.0,
    photo_brightness_factor: float = 1.0,
    show_logo: bool = True,
    extra_images: list[dict | None] | None = None,
) -> Path:
    _ensure_assets()
    x_handle = normalize_x_handle(x_handle)
    page_w = mm_to_pt(PAGE_MM[0])
    page_h = mm_to_pt(PAGE_MM[1])

    _ensure_preset_fonts_registered()
    catchphrase_font_key = _resolve_font_key(catchphrase_font_key)
    name_font_key = _resolve_font_key(name_font_key)
    front_font_name = _font_pdf_name(name_font_key)
    front_font_path = _font_file_path(catchphrase_font_key)
    name_size_factor = _clamp_factor(name_size_factor, 0.7, 1.5)
    catchphrase_orientation = "horizontal" if catchphrase_orientation == "horizontal" else "vertical"
    catchphrase_rotation_deg = _clamp_rotation_deg(catchphrase_rotation_deg)
    catchphrase_size_factor = _clamp_factor(catchphrase_size_factor, 0.6, 1.8)
    catchphrase_stroke_factor = _clamp_factor(catchphrase_stroke_factor, 0.0, 2.0)
    catchphrase_fill_color = "black" if catchphrase_fill_color == "black" else "white"
    photo_rotation_deg = _clamp_photo_rotation_deg(photo_rotation_deg)
    photo_brightness_factor = _clamp_factor(photo_brightness_factor, 0.5, 1.5)

    if name_pos_mm is not None:
        name_pos_mm = _clamp_name_pos_mm(name.strip(), name_pos_mm, front_font_name, size_factor=name_size_factor)
    if catchphrase_pos_mm is not None:
        catchphrase_pos_mm = _clamp_catchphrase_pos_mm(
            catchphrase,
            catchphrase_pos_mm,
            orientation=catchphrase_orientation,
            rotation_deg=catchphrase_rotation_deg,
            size_factor=catchphrase_size_factor,
            font_path=front_font_path,
        )

    front = build_custom_front(
        photo_path,
        catchphrase,
        name,
        x_handle,
        photo_offset=photo_offset,
        catchphrase_pos_mm=catchphrase_pos_mm,
        catchphrase_orientation=catchphrase_orientation,
        catchphrase_rotation_deg=catchphrase_rotation_deg,
        catchphrase_size_factor=catchphrase_size_factor,
        catchphrase_stroke_factor=catchphrase_stroke_factor,
        catchphrase_fill_color=catchphrase_fill_color,
        catchphrase_font_path=front_font_path,
        photo_scale=photo_scale,
        photo_rotation_deg=photo_rotation_deg,
        photo_brightness_factor=photo_brightness_factor,
        show_logo=show_logo,
        extra_images=extra_images,
    )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix="-front-cmyk.jpg", delete=False) as front_file:
        front_path = Path(front_file.name)
    try:
        front.convert("RGB").convert("CMYK").save(front_path, quality=96, subsampling=0)

        c = canvas.Canvas(str(output_path), pagesize=(page_w, page_h), pageCompression=1)
        c.setTitle("メスケモ推進委員会 名刺")
        c.drawImage(str(front_path), 0, 0, width=page_w, height=page_h)
        _draw_front_signature(
            c,
            page_w,
            page_h,
            name.strip(),
            x_handle,
            name_pos_mm=name_pos_mm,
            font_name=front_font_name,
            size_factor=name_size_factor,
        )
        c.showPage()
        _draw_back(c, page_w, page_h)
        c.showPage()
        c.save()
    finally:
        front_path.unlink(missing_ok=True)

    remove_unused_reportlab_default_font(output_path)
    return output_path
