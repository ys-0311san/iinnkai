#!/usr/bin/env python3
"""横型ポップ名刺（card_v5_pop）ビルダー。表裏2ページのCMYK PDFを生成する。

- 文字・図形はすべて reportlab のベクター（印刷でくっきり）
- 写真（任意）と QR のみラスターを配置
- 97x61mm / CMYK / 塗り足し3mm（トリム91x55mm）
- 表面QRは入力URLから自動生成、裏面QRは組織サイト固定
"""
from __future__ import annotations

import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import math

import qrcode
from PIL import Image, ImageEnhance
from reportlab.lib.colors import CMYKColor
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from card_builder import (
    DEFAULT_FONT_KEY,
    _ensure_preset_fonts_registered,
    _font_pdf_name,
    _resolve_font_key,
)
from print_assets import ASSETS, FONTS, LOGO, download_fonts

LOGO_PATH = LOGO
JP_FONT_PATH = FONTS / "ZenMaruGothic-Bold.ttf"
# パステル背景（表面のみ提供素材。裏面は transparent 版を流用する）
PASTEL_BG = {
    "pastel_slot": ASSETS / "pop_bg_slot_cmyk.jpg",
    "pastel_transparent": ASSETS / "pop_bg_transparent_cmyk.jpg",
}
PASTEL_BACK_BG = ASSETS / "pop_bg_transparent_cmyk.jpg"
# 支給の裏面（v5_back=pop用、パステルはQRあり/なしの2版）
POP_BACK_BG = ASSETS / "pop_back_v5_cmyk.jpg"
PASTEL_BACK_QR = ASSETS / "pastel_back_qr_cmyk.jpg"
PASTEL_BACK_NOQR = ASSETS / "pastel_back_noqr_cmyk.jpg"

PAGE_W_MM, PAGE_H_MM = 97.0, 61.0
PT = 72.0 / 25.4
ORG_URL = "https://mesukemo.uk"
ORG_X_HANDLE = "@mesukemo_ya"
# サブタイトルは固定文言（将来ユーザー編集可にする場合はここを差し替える）
SUBTITLE_LINES = ("VRChat Creator", "Unity Developer")

FONT_BOLD = "Helvetica-Bold"
FONT_REG = "Helvetica"
JP_FONT = "ZenMaruGothic"
# 名前・サブタイトル用フォント（縦型と同じ5プリセットを共有。既定は角ゴシック）
POP_DEFAULT_FONT_KEY = "zen-kaku-gothic-new"
_jp_registered = False


def _ensure_jp_font():
    global _jp_registered
    if not _jp_registered:
        download_fonts()
        pdfmetrics.registerFont(TTFont(JP_FONT, str(JP_FONT_PATH)))
        _jp_registered = True


def _name_font(font_key):
    """フォントプリセットを登録し、選択フォントのPDF名を返す（和欧対応）。"""
    _ensure_preset_fonts_registered()
    return _font_pdf_name(_resolve_font_key(font_key or POP_DEFAULT_FONT_KEY))


def _draw_name(c, x_mm, baseline_top_mm, name, max_mm, base_pt, color, font_name):
    """名前を選択フォントで描画。幅を超える場合は自動縮小。"""
    size = base_pt
    while size > base_pt * 0.6 and c.stringWidth(name, font_name, size) > mmpt(max_mm):
        size -= 0.5
    c.setFillColor(color)
    c.setFont(font_name, size)
    c.drawString(mmpt(x_mm), _T(baseline_top_mm), name)


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

# パステルスタイル用の配色（明るい背景に濃色＋金）
INK = rgb_to_cmyk(52, 46, 72)
INK2 = rgb_to_cmyk(120, 110, 130)
GOLD = rgb_to_cmyk(168, 132, 74)
GOLD_LOGO_RGB = (150, 120, 70)
PWHITE = rgb_to_cmyk(250, 246, 238)


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


def _concave_rect_path(c, x, y_top, w, h, r):
    """四隅が内側に抉れた（凹コーナー）矩形パス。装飾額縁の開口部形状に合わせる。"""
    x0, x1 = mmpt(x), mmpt(x + w)
    yt, yb = _T(y_top), _T(y_top + h)
    R = mmpt(r)
    p = c.beginPath()
    p.moveTo(x0 + R, yt)
    p.lineTo(x1 - R, yt)
    p.arcTo(x1 - R, yt - R, x1 + R, yt + R, 180, 90)   # 右上
    p.lineTo(x1, yb + R)
    p.arcTo(x1 - R, yb - R, x1 + R, yb + R, 90, 90)     # 右下
    p.lineTo(x0 + R, yb)
    p.arcTo(x0 - R, yb - R, x0 + R, yb + R, 0, 90)       # 左下
    p.lineTo(x0, yt - R)
    p.arcTo(x0 - R, yt - R, x0 + R, yt + R, 270, 90)     # 左上
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


def _cover_adjusted(img, w_mm, h_mm, scale_factor=1.0, rotation_deg=0.0, brightness=1.0,
                    x_bias=0.5, y_bias=0.5, fill=(24, 30, 45), dpi=600):
    """写真を寄り引き(scale)・回転・明るさ付きで cover 切り抜き。"""
    if brightness != 1.0:
        img = ImageEnhance.Brightness(img).enhance(brightness)
    if rotation_deg:
        img = img.rotate(-rotation_deg, expand=True, resample=Image.Resampling.BICUBIC, fillcolor=fill)
    tw, th = round(w_mm / 25.4 * dpi), round(h_mm / 25.4 * dpi)
    base = max(tw / img.width, th / img.height)
    scale = base * max(1.0, scale_factor)
    rw, rh = max(tw, round(img.width * scale)), max(th, round(img.height * scale))
    im2 = img.resize((rw, rh), Image.Resampling.LANCZOS)
    left = round((rw - tw) * x_bias)
    top = round((rh - th) * y_bias)
    return im2.crop((left, top, left + tw, top + th))


def _subtitle_lines(subtitle):
    """サブタイトル文字列を最大2行に。未指定なら固定文言。"""
    if subtitle is None:
        return list(SUBTITLE_LINES)
    lines = [ln.strip() for ln in str(subtitle).splitlines() if ln.strip()]
    return lines[:2]


def _draw_pop_extra_images(c, extra_images, dpi=600):
    """追加画像を任意位置(x_mm,y_mm 中心)・拡縮・回転で重ねる（縦型と同仕様）。"""
    items = [ex for ex in (extra_images or []) if ex]
    if not items:
        return
    W, H = round(PAGE_W_MM / 25.4 * dpi), round(PAGE_H_MM / 25.4 * dpi)
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    base_mm = 22.0
    for ex in items:
        with Image.open(ex["path"]) as src:
            img = src.convert("RGBA")
        contain = round(base_mm * float(ex.get("scale_factor", 1.0)) / 25.4 * dpi)
        ratio = min(contain / img.width, contain / img.height)
        img = img.resize((max(1, round(img.width * ratio)), max(1, round(img.height * ratio))), Image.Resampling.LANCZOS)
        img = img.rotate(-float(ex.get("rotation_deg", 0.0)), expand=True, resample=Image.Resampling.BICUBIC)
        cx = round(float(ex.get("x_mm", PAGE_W_MM / 2)) / 25.4 * dpi)
        cy = round(float(ex.get("y_mm", PAGE_H_MM / 2)) / 25.4 * dpi)
        layer.alpha_composite(img, (cx - img.width // 2, cy - img.height // 2))
    buf = io.BytesIO()
    layer.save(buf, "PNG")
    buf.seek(0)
    c.drawImage(ImageReader(buf), 0, 0, width=mmpt(PAGE_W_MM), height=mmpt(PAGE_H_MM), mask="auto")


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


def _draw_front(c, accent, photo, photo_ybias, show_qr, url, name, x_handle,
                font_name, subtitle_lines, photo_scale, photo_rotation, photo_brightness, extra_images):
    site_label = url_label(url)
    c.setFillColor(BG)
    c.rect(0, 0, mmpt(PAGE_W_MM), mmpt(PAGE_H_MM), stroke=0, fill=1)

    px, py, pw, ph, pr = 9.5, 9.5, 38.0, 42.0, 3.2
    if photo is None:
        _draw_photo_placeholder(c, px, py, pw, ph)
    else:
        crop = _cover_adjusted(Image.open(photo).convert("RGB"), pw, ph, photo_scale, photo_rotation,
                               photo_brightness, x_bias=0.52, y_bias=photo_ybias, fill=(6, 10, 20))
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

    # 追加画像（任意位置・拡縮・回転）。テキストの下に重ねる
    _draw_pop_extra_images(c, extra_images)

    name_x = 55.0
    # 名前（選択フォント・幅29mmで自動縮小。装飾アークと重ならない範囲）
    _draw_name(c, name_x, 28.0, name, max_mm=29.0, base_pt=19, color=OFFWHITE, font_name=font_name)
    c.setFillColor(accent)
    c.roundRect(mmpt(name_x), _T(39.5), mmpt(1.3), mmpt(9.0), mmpt(0.65), stroke=0, fill=1)
    sub_x = name_x + 3.0
    c.setFillColor(SUBTITLE)
    c.setFont(font_name, 7.5)
    for i, line in enumerate(subtitle_lines[:2]):
        c.drawString(mmpt(sub_x), _T(33.6 + i * 4.0), line)
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
    """pop（ダークネイビー）裏面：支給の v5_back 画像をそのまま配置。"""
    _draw_full_bg(c, POP_BACK_BG)


def _draw_full_bg(c, path):
    bg = Image.open(path).convert("CMYK")
    buf = io.BytesIO()
    bg.save(buf, "JPEG", quality=94, subsampling=0)
    buf.seek(0)
    c.drawImage(ImageReader(buf), 0, 0, width=mmpt(PAGE_W_MM), height=mmpt(PAGE_H_MM))


def _tinted_logo(rgb):
    """白抜きロゴを指定色に着色したRGBAを返す（明るい背景で見えるように）。"""
    lg = Image.open(LOGO_PATH).convert("RGBA")
    alpha = lg.getchannel("A")
    solid = Image.new("RGBA", lg.size, tuple(rgb) + (0,))
    solid.putalpha(alpha)
    return solid


def _contain(im, w_mm, h_mm, dpi=600):
    tw, th = round(w_mm / 25.4 * dpi), round(h_mm / 25.4 * dpi)
    im = im.copy()
    im.thumbnail((tw, th), Image.Resampling.LANCZOS)
    return im


def _fit_label(c, text, max_mm, font=FONT_BOLD, mx=8.0, mn=6.0):
    """幅に収まる (表示テキスト, サイズpt) を返す。収まらなければドメインのみ→末尾省略。"""
    def fit(t):
        s = mx
        while s > mn and c.stringWidth(t, font, s) > mmpt(max_mm):
            s -= 0.25
        return (t, s) if c.stringWidth(t, font, s) <= mmpt(max_mm) else None

    host = text.split("/")[0]
    chosen = fit(text) or fit(host)
    if chosen is None:
        t = host
        while t and c.stringWidth(t + "…", font, mn) > mmpt(max_mm):
            t = t[:-1]
        chosen = ((t + "…") if t else text, mn)
    return chosen


def _draw_pastel_text(c, url, name, x_handle, show_qr, font_name, subtitle_lines):
    """パステル背景の右側余白に、濃色＋金でテキストとQRを配置。"""
    nx = 53.0
    # 名前（選択フォント・幅35mmで自動縮小）
    _draw_name(c, nx, 27.5, name, max_mm=35.0, base_pt=20, color=INK, font_name=font_name)
    c.setFillColor(GOLD)
    c.roundRect(mmpt(nx), _T(39.0), mmpt(1.2), mmpt(8.5), mmpt(0.6), stroke=0, fill=1)
    c.setFillColor(INK2)
    c.setFont(font_name, 7.5)
    for i, line in enumerate(subtitle_lines[:2]):
        c.drawString(mmpt(nx + 3), _T(33.2 + i * 4.0), line)
    c.setFillColor(GOLD)
    c.setFont(FONT_BOLD, 11)
    c.drawString(mmpt(nx), _T(44.0), x_handle)
    qx, qy, qs, qpad = 74.0, 39.0, 11.5, 1.0
    label_max = ((qx - 1.5) if show_qr else (90.0)) - nx
    label_text, label_size = _fit_label(c, url_label(url), label_max)
    c.setFillColor(GOLD)
    c.setFont(FONT_BOLD, label_size)
    c.drawString(mmpt(nx), _T(49.2), label_text)
    if show_qr:
        c.setFillColor(PWHITE)
        c.roundRect(mmpt(qx), _T(qy + qs), mmpt(qs), mmpt(qs), mmpt(1.5), stroke=0, fill=1)
        qb = io.BytesIO()
        _make_qr(url).convert("CMYK").save(qb, "JPEG", quality=95, subsampling=0)
        qb.seek(0)
        inner = qs - qpad * 2
        c.drawImage(ImageReader(qb), mmpt(qx + qpad), _T(qy + qpad + inner), width=mmpt(inner), height=mmpt(inner))


def _draw_pastel_front(c, style, photo, show_qr, url, name, x_handle,
                       font_name, subtitle_lines, photo_scale, photo_rotation, photo_brightness, extra_images):
    _draw_full_bg(c, PASTEL_BG[style])
    if photo is not None:
        if style == "pastel_slot":
            # 装飾額縁の内側開口部（凹コーナー）に cover 配置（寄り引き/回転/明るさ対応）
            sx, sy, sw, sh, sr = 13.3, 12.0, 29.6, 38.6, 3.0
            crop = _cover_adjusted(Image.open(photo).convert("RGB"), sw, sh, photo_scale, photo_rotation,
                                   photo_brightness, x_bias=0.52, y_bias=0.06, fill=(240, 238, 230))
            pb = io.BytesIO()
            crop.convert("CMYK").save(pb, "JPEG", quality=94, subsampling=0)
            pb.seek(0)
            c.saveState()
            c.clipPath(_concave_rect_path(c, sx, sy, sw, sh, sr), stroke=0, fill=0)
            c.drawImage(ImageReader(pb), mmpt(sx), _T(sy + sh), width=mmpt(sw), height=mmpt(sh))
            c.restoreState()
        else:  # pastel_transparent：透過PNGを左寄り・下揃えで重ねる
            over = Image.open(photo).convert("RGBA")
            if photo_brightness != 1.0:
                r, g, b, al = over.split()
                rgb = ImageEnhance.Brightness(Image.merge("RGB", (r, g, b))).enhance(photo_brightness)
                over = Image.merge("RGBA", (*rgb.split(), al))
            if photo_rotation:
                over = over.rotate(-photo_rotation, expand=True, resample=Image.Resampling.BICUBIC)
            fit = _contain(over, 44.0 * max(1.0, photo_scale), 55.0 * max(1.0, photo_scale))
            w_mm, h_mm = fit.width / 600 * 25.4, fit.height / 600 * 25.4
            pb = io.BytesIO()
            fit.save(pb, "PNG")
            pb.seek(0)
            x = 26.0 - w_mm / 2
            y = 59.0 - h_mm
            c.drawImage(ImageReader(pb), mmpt(x), _T(y + h_mm), width=mmpt(w_mm), height=mmpt(h_mm), mask="auto")
    _draw_pop_extra_images(c, extra_images)
    _draw_pastel_text(c, url, name, x_handle, show_qr, font_name, subtitle_lines)


def _draw_pastel_back(c, show_qr):
    """パステル裏面：支給テンプレ（QRあり/なし）に丸ロゴ・組織情報・QRを配置。"""
    _ensure_jp_font()
    _draw_full_bg(c, PASTEL_BACK_QR if show_qr else PASTEL_BACK_NOQR)
    # 左の円に丸ロゴ（金着色）
    logo = _tinted_logo(GOLD_LOGO_RGB)
    lsz = 19.0
    lcx, lcy = 25.0, 27.5
    lb = io.BytesIO()
    logo.save(lb, "PNG")
    lb.seek(0)
    c.drawImage(ImageReader(lb), mmpt(lcx - lsz / 2), _T(lcy + lsz / 2), width=mmpt(lsz), height=mmpt(lsz), mask="auto")
    # 3行（星＝組織名／地球＝サイト／ハート＝X）
    tx = 53.0
    c.setFillColor(INK)
    c.setFont(JP_FONT, 7.5)
    c.drawString(mmpt(tx), _T(31.5), "メスケモ推進委員会")
    c.setFont(FONT_BOLD, 8.5)
    c.drawString(mmpt(tx), _T(39.0), url_label(ORG_URL))
    c.setFont(JP_FONT, 7.5)
    c.drawString(mmpt(tx), _T(46.0), "X  " + ORG_X_HANDLE)
    # 右下の四角にQR（QRあり版のみ）
    if show_qr:
        qs = 10.0
        qcx, qcy = 82.0, 46.5
        qb = io.BytesIO()
        _make_qr(ORG_URL).convert("CMYK").save(qb, "JPEG", quality=95, subsampling=0)
        qb.seek(0)
        c.drawImage(ImageReader(qb), mmpt(qcx - qs / 2), _T(qcy + qs / 2), width=mmpt(qs), height=mmpt(qs))


def generate_pop_pdf(out_path, style="pop", accent_name="mustard", photo=None, show_qr=True,
                     url=ORG_URL, name="Yuuya", x_handle="@yuuya", photo_ybias=0.05,
                     font_key=POP_DEFAULT_FONT_KEY, subtitle=None,
                     photo_scale=1.0, photo_rotation_deg=0.0, photo_brightness=1.0,
                     extra_images=None):
    url = normalize_url(url)
    photo_path = Path(photo) if photo else None
    font_name = _name_font(font_key)
    subtitle_lines = _subtitle_lines(subtitle)
    photo_scale = max(1.0, min(2.5, float(photo_scale)))
    photo_rotation_deg = max(-15.0, min(15.0, float(photo_rotation_deg)))
    photo_brightness = max(0.5, min(1.5, float(photo_brightness)))
    page = (mmpt(PAGE_W_MM), mmpt(PAGE_H_MM))
    c = canvas.Canvas(str(out_path), pagesize=page, pageCompression=1)
    c.setTitle("メスケモ推進委員会 名刺 card_v5_pop")
    if style in ("pastel_slot", "pastel_transparent"):
        _draw_pastel_front(c, style, photo_path, show_qr, url, name, x_handle,
                           font_name, subtitle_lines, photo_scale, photo_rotation_deg, photo_brightness, extra_images)
        c.showPage()
        _draw_pastel_back(c, show_qr)
        c.showPage()
    else:  # pop（ダークネイビー）
        accent = ACCENTS.get(accent_name, ACCENTS["mustard"])
        _draw_front(c, accent, photo_path, photo_ybias, show_qr, url, name, x_handle,
                    font_name, subtitle_lines, photo_scale, photo_rotation_deg, photo_brightness, extra_images)
        c.showPage()
        _draw_back(c, accent)
        c.showPage()
    c.save()
    return out_path
