#!/usr/bin/env python3
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
ASSETS = ROOT / "assets"

PAGE_MM = (97.0, 61.0)
DPI = 635
WIDTH = round(PAGE_MM[0] / 25.4 * DPI)
HEIGHT = round(PAGE_MM[1] / 25.4 * DPI)
SCALE = DPI / 25.4

WOOD_TEXTURE = REPO_ROOT / "images" / "wood-texture.jpg"
LOGO = REPO_ROOT / "images" / "card-logo.png"


def mm(value: float) -> int:
    return round(value * SCALE)


def mirror_tile(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    tile_w, tile_h = source.size
    tiled = Image.new("RGB", size)
    for y in range(0, size[1], tile_h):
        for x in range(0, size[0], tile_w):
            tile = source
            if (x // tile_w) % 2:
                tile = ImageOps.mirror(tile)
            if (y // tile_h) % 2:
                tile = ImageOps.flip(tile)
            tiled.paste(tile, (x, y))
    return tiled


def color_grade_wood(img: Image.Image) -> Image.Image:
    img = ImageEnhance.Color(img).enhance(0.72)
    img = ImageEnhance.Contrast(img).enhance(1.16)
    img = ImageEnhance.Brightness(img).enhance(0.64)

    brown = Image.new("RGB", img.size, "#4a3028")
    cedar = Image.new("RGB", img.size, "#8b6f47")
    img = Image.blend(ImageChops.multiply(img, brown), ImageChops.overlay(img, cedar), 0.44)

    vignette = Image.new("L", img.size, 0)
    px = vignette.load()
    center_x = img.size[0] * 0.43
    center_y = img.size[1] * 0.48
    max_dist = math.hypot(max(center_x, img.size[0] - center_x), max(center_y, img.size[1] - center_y))
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            dist = math.hypot(x - center_x, y - center_y) / max_dist
            px[x, y] = max(0, min(118, round((dist**1.65) * 118)))
    dark = Image.new("RGB", img.size, "#1f1512")
    img = Image.composite(dark, img, vignette.filter(ImageFilter.GaussianBlur(mm(3.5))))

    glow = Image.new("L", img.size, 0)
    gpx = glow.load()
    glow_rx = img.size[0] * 0.42
    glow_ry = img.size[1] * 0.55
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            dx = (x - center_x) / glow_rx
            dy = (y - center_y) / glow_ry
            amount = max(0.0, 1.0 - math.sqrt(dx * dx + dy * dy))
            gpx[x, y] = round((amount**1.8) * 34)
    warm_light = Image.new("RGB", img.size, "#8b6f47")
    return Image.composite(warm_light, img, glow.filter(ImageFilter.GaussianBlur(mm(6.0))))


def draw_kumiko(img: Image.Image) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    left, top = mm(4.9), mm(4.9)
    right, bottom = img.size[0] - mm(4.9), img.size[1] - mm(4.9)
    spacing = mm(8.0)
    tri_h = round(spacing * math.sqrt(3) / 2)
    color = (212, 175, 55, 22)
    width = max(1, mm(0.15))

    for row, y in enumerate(range(top - tri_h * 2, bottom + tri_h * 2, tri_h)):
        offset = -spacing // 2 if row % 2 else 0
        for x in range(left - spacing * 2 + offset, right + spacing * 2, spacing):
            p1 = (x, y)
            p2 = (x + spacing // 2, y + tri_h)
            p3 = (x - spacing // 2, y + tri_h)
            center = (x, y + round(tri_h * 0.58))
            for a, b in ((p1, p2), (p2, p3), (p3, p1), (p1, center), (p2, center), (p3, center)):
                draw.line([a, b], fill=color, width=width)

    mask = Image.new("L", img.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rectangle([left, top, right, bottom], fill=255)
    inset = mm(9.5)
    mask_draw.rectangle([left + inset, top + inset, right - inset, bottom - inset], fill=0)
    img.alpha_composite(Image.composite(overlay, Image.new("RGBA", img.size, (0, 0, 0, 0)), mask))


def foil_color(t: float) -> tuple[int, int, int, int]:
    highlight = 0.5 + 0.5 * math.sin(t * math.tau * 3.0 - 0.65)
    glint = max(0.0, math.sin(t * math.tau * 9.0 + 1.2)) ** 9
    r = round(145 + highlight * 78 + glint * 32)
    g = round(108 + highlight * 60 + glint * 28)
    b = round(31 + highlight * 28 + glint * 18)
    return (r, g, b, 226)


def draw_gradient_rect(draw: ImageDraw.ImageDraw, box: list[int], width: int) -> None:
    left, top, right, bottom = box
    perimeter = 2 * ((right - left) + (bottom - top))
    progress = 0
    for x in range(left, right + 1):
        color = foil_color(progress / perimeter)
        draw.line([(x, top), (x, top + width - 1)], fill=color)
        progress += 1
    for y in range(top, bottom + 1):
        color = foil_color(progress / perimeter)
        draw.line([(right - width + 1, y), (right, y)], fill=color)
        progress += 1
    for x in range(right, left - 1, -1):
        color = foil_color(progress / perimeter)
        draw.line([(x, bottom - width + 1), (x, bottom)], fill=color)
        progress += 1
    for y in range(bottom, top - 1, -1):
        color = foil_color(progress / perimeter)
        draw.line([(left, y), (left + width - 1, y)], fill=color)
        progress += 1


def draw_frame(img: Image.Image) -> None:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], outline=(70, 45, 34, 255), width=mm(2.7))
    draw_gradient_rect(draw, [mm(3.0), mm(3.0), img.size[0] - mm(3.0), img.size[1] - mm(3.0)], mm(0.55))
    draw_gradient_rect(draw, [mm(4.6), mm(4.6), img.size[0] - mm(4.6), img.size[1] - mm(4.6)], mm(0.35))

    cx_positions = (mm(4.85), img.size[0] - mm(4.85))
    cy_positions = (mm(4.85), img.size[1] - mm(4.85))
    half = mm(1.55)
    for cy in cy_positions:
        for cx in cx_positions:
            points = [(cx, cy - half), (cx + half, cy), (cx, cy + half), (cx - half, cy)]
            draw.polygon(points, outline=(224, 187, 65, 185), fill=(120, 85, 23, 46))
            draw.line([points[0], points[2]], fill=(245, 219, 119, 112), width=max(1, mm(0.12)))
            draw.line([points[1], points[3]], fill=(245, 219, 119, 86), width=max(1, mm(0.12)))

    img.alpha_composite(overlay)


def make_name_plate(source: Image.Image) -> Image.Image:
    w, h = mm(42.0), mm(13.0)
    plate = mirror_tile(source.crop((0, 0, min(source.width, w), min(source.height, h))), (w, h))
    plate = ImageEnhance.Color(plate).enhance(0.22)
    plate = ImageOps.grayscale(plate).convert("RGB")
    plate = ImageOps.colorize(ImageOps.grayscale(plate), black="#130e0c", white="#3a2a22")
    plate = ImageEnhance.Contrast(plate).enhance(1.35)
    plate = ImageEnhance.Brightness(plate).enhance(0.58).convert("RGBA")

    alpha = Image.new("L", (w, h), 235)
    alpha = alpha.filter(ImageFilter.GaussianBlur(mm(0.15)))
    plate.putalpha(alpha)

    shadow = Image.new("RGBA", (w + mm(1.4), h + mm(1.4)), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rectangle([mm(0.7), mm(0.7), w + mm(0.7), h + mm(0.7)], fill=(0, 0, 0, 88))
    shadow = shadow.filter(ImageFilter.GaussianBlur(mm(0.45)))

    canvas = Image.new("RGBA", shadow.size, (0, 0, 0, 0))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(plate, (mm(0.7), mm(0.45)))
    draw = ImageDraw.Draw(canvas)
    y1 = mm(0.45)
    y2 = y1 + h - 1
    for y in (y1, y2):
        draw.line([(mm(0.7), y), (mm(0.7) + w, y)], fill=(220, 179, 57, 210), width=max(1, mm(0.3)))
        draw.line([(mm(0.7), y + (1 if y == y1 else -1)), (mm(0.7) + w, y + (1 if y == y1 else -1))], fill=(94, 67, 22, 145), width=max(1, mm(0.12)))
    return canvas


def build_backgrounds() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    wood = Image.open(WOOD_TEXTURE).convert("RGB")
    base = mirror_tile(wood, (WIDTH, HEIGHT))
    base = color_grade_wood(base).convert("RGBA")
    draw_kumiko(base)

    plate = make_name_plate(wood)
    base.alpha_composite(plate, (mm(5.3), mm(41.55)))
    draw_frame(base)

    rgb = base.convert("RGB")
    rgb.save(ASSETS / "card-bg.png", optimize=True)

    logo = Image.open(LOGO).convert("RGBA")
    logo_size = mm(20.0)
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    cmyk_source = base.copy()
    cmyk_source.alpha_composite(logo, (mm(6.0), mm(6.0)))
    cmyk_source.convert("RGB").convert("CMYK").save(ASSETS / "card-bg-logo-cmyk.jpg", quality=96, subsampling=0)


if __name__ == "__main__":
    build_backgrounds()
