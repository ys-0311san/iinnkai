#!/usr/bin/env python3
from __future__ import annotations

import math
import shutil
from pathlib import Path

import cv2
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
ASSETS = ROOT / "assets"

PAGE_MM = (61.0, 97.0)
DPI = 635
WIDTH = round(PAGE_MM[0] / 25.4 * DPI)
HEIGHT = round(PAGE_MM[1] / 25.4 * DPI)
SCALE = DPI / 25.4

WOOD_TEXTURE = REPO_ROOT / "images" / "wood-texture.jpg"
LOGO = REPO_ROOT / "images" / "card-logo.png"
FRONT_PHOTO_SOURCE = Path("/mnt/e/picture2/ee381eef14057097.png")
FRONT_PHOTO_ASSET = ASSETS / "front-photo-source.png"
HEADER_BANNER_SOURCE = REPO_ROOT / "images" / "header-banner.png"
HEADER_BANNER_CLEAN_ASSET = ASSETS / "header-banner-clean.png"


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


def color_grade_wood(img: Image.Image, mode: str = "back") -> Image.Image:
    if mode == "front":
        img = ImageEnhance.Color(img).enhance(0.34)
        img = ImageEnhance.Contrast(img).enhance(1.28)
        img = ImageEnhance.Brightness(img).enhance(0.42)
        shadow_color = "#0d0a08"
        light_color = "#1a1310"
        glow_strength = 0
        vignette_strength = 58
        dark_color = "#070504"
    else:
        img = ImageEnhance.Color(img).enhance(0.72)
        img = ImageEnhance.Contrast(img).enhance(1.16)
        img = ImageEnhance.Brightness(img).enhance(0.64)
        shadow_color = "#4a3028"
        light_color = "#8b6f47"
        glow_strength = 34
        vignette_strength = 118
        dark_color = "#1f1512"

    shadow_tone = Image.new("RGB", img.size, shadow_color)
    light_tone = Image.new("RGB", img.size, light_color)
    img = Image.blend(ImageChops.multiply(img, shadow_tone), ImageChops.overlay(img, light_tone), 0.44)

    vignette = Image.new("L", img.size, 0)
    px = vignette.load()
    center_x = img.size[0] * 0.43
    center_y = img.size[1] * 0.48
    max_dist = math.hypot(max(center_x, img.size[0] - center_x), max(center_y, img.size[1] - center_y))
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            dist = math.hypot(x - center_x, y - center_y) / max_dist
            px[x, y] = max(0, min(vignette_strength, round((dist**1.65) * vignette_strength)))
    dark = Image.new("RGB", img.size, dark_color)
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
            gpx[x, y] = round((amount**1.8) * glow_strength)
    warm_light = Image.new("RGB", img.size, light_color)
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
    draw_gradient_rect(draw, [mm(4.0), mm(4.0), img.size[0] - mm(4.0), img.size[1] - mm(4.0)], mm(0.68))
    draw_gradient_rect(draw, [mm(5.4), mm(5.4), img.size[0] - mm(5.4), img.size[1] - mm(5.4)], mm(0.42))

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


def make_name_plate(source: Image.Image, width_mm: float = 42.0, height_mm: float = 13.0) -> Image.Image:
    w, h = mm(width_mm), mm(height_mm)
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


def make_common_background(wood: Image.Image, mode: str, include_kumiko: bool = True) -> Image.Image:
    base = mirror_tile(wood, (WIDTH, HEIGHT))
    base = color_grade_wood(base, mode=mode).convert("RGBA")
    if include_kumiko:
        draw_kumiko(base)
    return base


def copy_front_source() -> None:
    if not FRONT_PHOTO_SOURCE.exists():
        raise FileNotFoundError(f"Front photo source was not found: {FRONT_PHOTO_SOURCE}")
    if not FRONT_PHOTO_ASSET.exists() or FRONT_PHOTO_ASSET.stat().st_mtime < FRONT_PHOTO_SOURCE.stat().st_mtime:
        shutil.copyfile(FRONT_PHOTO_SOURCE, FRONT_PHOTO_ASSET)


def clean_banner_source() -> Path:
    if (
        HEADER_BANNER_CLEAN_ASSET.exists()
        and HEADER_BANNER_CLEAN_ASSET.stat().st_mtime >= HEADER_BANNER_SOURCE.stat().st_mtime
    ):
        return HEADER_BANNER_CLEAN_ASSET

    source = cv2.imread(str(HEADER_BANNER_SOURCE))
    h, w = source.shape[:2]
    upscaled = cv2.resize(source, (w * 2, h * 2), interpolation=cv2.INTER_LANCZOS4)
    denoised = cv2.fastNlMeansDenoisingColored(
        upscaled, None, h=8, hColor=8, templateWindowSize=7, searchWindowSize=21
    )
    ASSETS.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(HEADER_BANNER_CLEAN_ASSET), denoised)
    return HEADER_BANNER_CLEAN_ASSET


def find_banner_crop_y(photo: Image.Image) -> int:
    width, height = photo.size
    scan_start = max(0, height - 260)
    first_banner_y: int | None = None
    for y in range(height - 1, scan_start - 1, -1):
        row = photo.crop((0, y, width, y + 1)).getdata()
        pink_pixels = 0
        for r, g, b in row:
            if r > 180 and b > 135 and g < 120 and max(r, g, b) - min(r, g, b) > 80:
                pink_pixels += 1
        if pink_pixels / width > 0.005:
            first_banner_y = y if first_banner_y is None else min(first_banner_y, y)

    if first_banner_y is None:
        return height
    return max(1, first_banner_y - 42)


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


def lift_shadows(img: Image.Image, gamma: float = 1.12) -> Image.Image:
    lut = [round(255 * ((i / 255) ** (1 / gamma))) for i in range(256)]
    return img.point(lut * 3)


def build_front_from_photo() -> Image.Image:
    copy_front_source()
    photo = Image.open(FRONT_PHOTO_ASSET).convert("RGB")
    crop_y = find_banner_crop_y(photo)
    photo = photo.crop((0, 0, photo.width, crop_y))
    photo = lift_shadows(photo)
    front = cover_image(photo, (WIDTH, HEIGHT), x_bias=0.40).convert("RGBA")
    add_bottom_scrim(front)
    logo_size = mm(14.0)
    logo = Image.open(LOGO).convert("RGBA")
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    alpha = logo.getchannel("A").point(lambda value: round(value * 0.75))
    logo.putalpha(alpha)
    front.alpha_composite(logo, (mm(6.0), HEIGHT - mm(6.0) - logo_size))
    return front


def save_rgb_and_cmyk(img: Image.Image, rgb_name: str, cmyk_name: str) -> None:
    rgb = img.convert("RGB")
    rgb.save(ASSETS / rgb_name, optimize=True)
    rgb.convert("CMYK").save(ASSETS / cmyk_name, quality=96, subsampling=0)


def build_backgrounds() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)
    wood = Image.open(WOOD_TEXTURE).convert("RGB")
    clean_banner_source()

    front = build_front_from_photo()
    save_rgb_and_cmyk(front, "card-bg-front.png", "card-bg-front-cmyk.jpg")

    back = make_common_background(wood, "back")
    logo = Image.open(LOGO).convert("RGBA")
    logo_size = mm(24.0)
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    back.alpha_composite(logo, ((WIDTH - logo_size) // 2, mm(9.0)))
    draw_frame(back)
    save_rgb_and_cmyk(back, "card-bg-back.png", "card-bg-back-cmyk.jpg")


if __name__ == "__main__":
    build_backgrounds()
