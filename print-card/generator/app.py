#!/usr/bin/env python3
from __future__ import annotations

import io
import tempfile
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from flask import Flask, abort, render_template, request, send_file
from werkzeug.utils import secure_filename

from card_builder import (
    DEFAULT_FONT_KEY,
    FONT_PRESETS,
    generate_pdf,
    normalize_x_handle,
    safe_download_name,
)
from card_v5_builder import generate_pop_pdf
from print_assets import FONTS, LOGO, STATIC_DIR, TEMPLATES_DIR, download_fonts


app = Flask(
    __name__,
    template_folder=str(TEMPLATES_DIR),
    static_folder=str(STATIC_DIR),
)
app.config["MAX_CONTENT_LENGTH"] = 40 * 1024 * 1024
download_fonts()
FONT_ASSET_FILES = {preset["file"] for preset in FONT_PRESETS.values()}


def _parse_mm_pair(x_name: str, y_name: str) -> tuple[float, float] | None:
    try:
        return (float(request.form[x_name]), float(request.form[y_name]))
    except (KeyError, TypeError, ValueError):
        return None


def _parse_float(name: str, fallback: float) -> float:
    try:
        return float(request.form[name])
    except (KeyError, TypeError, ValueError):
        return fallback


def _clamp(value: float, minimum: float, maximum: float) -> float:
    if maximum < minimum:
        return minimum
    return min(maximum, max(minimum, value))


def _parse_choice(name: str, choices: set[str], fallback: str) -> str:
    value = request.form.get(name, fallback)
    return value if value in choices else fallback


def _parse_extra_images(temp_dir: Path) -> list[dict | None]:
    extras: list[dict | None] = []
    for i in range(1, 4):
        file = request.files.get(f"extra{i}_image")
        if file is None or file.filename == "":
            extras.append(None)
            continue
        suffix = Path(secure_filename(file.filename)).suffix or ".png"
        path = temp_dir / f"extra{i}{suffix}"
        file.save(path)
        extras.append(
            {
                "path": path,
                "x_mm": _parse_float(f"extra{i}_x_mm", 30.5),
                "y_mm": _parse_float(f"extra{i}_y_mm", 48.5),
                "scale_factor": _clamp(_parse_float(f"extra{i}_scale", 100.0), 30.0, 250.0) / 100.0,
                "rotation_deg": _clamp(_parse_float(f"extra{i}_rotation_deg", 0.0), -180.0, 180.0),
            }
        )
    return extras


@app.get("/")
def index():
    return render_template("index.html", error=None, values={})


@app.get("/assets/card-logo.png")
def card_logo():
    return send_file(LOGO, mimetype="image/png")


@app.get("/assets/fonts/<path:filename>")
def font_asset(filename: str):
    if filename not in FONT_ASSET_FILES:
        abort(404)
    return send_file(FONTS / filename)


def _generate_pop():
    """横型ポップ名刺（card_v5_pop）の表裏2ページCMYK PDFを生成して返す。"""
    name = request.form.get("name", "").strip()
    x_handle = request.form.get("x_handle", "").strip()
    url = request.form.get("url", "").strip()
    style = _parse_choice("pop_style", {"pop", "pastel_slot", "pastel_transparent"}, "pop")
    accent = _parse_choice("accent", {"mustard", "coral"}, "mustard")
    show_qr = request.form.get("pop_show_qr") is not None
    use_photo = request.form.get("pop_use_photo") is not None
    font_key = request.form.get("font_key") or "zen-kaku-gothic-new"
    if font_key not in FONT_PRESETS:
        font_key = "zen-kaku-gothic-new"
    subtitle = request.form.get("pop_subtitle", "VRChat Creator\nUnity Developer")
    photo_scale = _clamp(_parse_float("pop_photo_scale", 100.0), 100.0, 250.0) / 100.0
    photo_rotation_deg = _clamp(_parse_float("pop_photo_rotation_deg", 0.0), -15.0, 15.0)
    photo_brightness = _clamp(_parse_float("pop_photo_brightness", 100.0), 50.0, 150.0) / 100.0
    values = {"name": name, "x_handle": x_handle, "url": url}

    if not name:
        return render_template("index.html", error="名前を入力してください。", values=values), 400
    if not x_handle:
        return render_template("index.html", error="Xアカウントを入力してください。", values=values), 400

    temp_dir = Path(tempfile.mkdtemp(prefix="meishi-pop-"))
    output_path = temp_dir / "meishi_pop_cmyk.pdf"
    photo_path: Path | None = None
    photo = request.files.get("photo")
    if use_photo and photo is not None and photo.filename != "":
        suffix = Path(secure_filename(photo.filename)).suffix or ".png"
        photo_path = temp_dir / f"photo{suffix}"
        photo.save(photo_path)
    extra_images = _parse_extra_images(temp_dir)

    def _cleanup():
        extra_paths = [ex["path"] for ex in extra_images if ex is not None]
        for path in (photo_path, output_path, *extra_paths):
            if path is not None:
                path.unlink(missing_ok=True)
        temp_dir.rmdir()

    try:
        normalized_handle = normalize_x_handle(x_handle)
        generate_pop_pdf(
            output_path,
            style=style,
            accent_name=accent,
            photo=photo_path,
            show_qr=show_qr,
            url=url,
            name=name,
            x_handle=normalized_handle,
            font_key=font_key,
            subtitle=subtitle,
            photo_scale=photo_scale,
            photo_rotation_deg=photo_rotation_deg,
            photo_brightness=photo_brightness,
            extra_images=extra_images,
        )
    except Exception:
        _cleanup()
        raise

    pdf_bytes = output_path.read_bytes()
    _cleanup()

    return send_file(
        io.BytesIO(pdf_bytes),
        as_attachment=True,
        download_name=f"meishi_pop_{safe_download_name(name)}_cmyk.pdf",
        mimetype="application/pdf",
    )


@app.post("/generate")
def generate():
    if request.form.get("template", "vertical") == "pop":
        return _generate_pop()

    photo = request.files.get("photo")
    catchphrase = request.form.get("catchphrase", "").strip()
    name = request.form.get("name", "").strip()
    x_handle = request.form.get("x_handle", "").strip()
    show_logo = request.form.get("show_logo") is not None
    photo_scale = _parse_float("photo_scale", 1.0)
    photo_rotation_deg = _clamp(_parse_float("photo_rotation_deg", 0.0), -15.0, 15.0)
    photo_brightness = _clamp(_parse_float("photo_brightness", 100.0), 50.0, 150.0)
    photo_brightness_factor = photo_brightness / 100.0
    catchphrase_orientation = _parse_choice("catchphrase_orientation", {"vertical", "horizontal"}, "vertical")
    catchphrase_rotation_deg = _parse_float("catchphrase_rotation_deg", 0.0)
    catchphrase_size_factor = _parse_float("catchphrase_size_factor", 1.0)
    catchphrase_stroke_factor = _parse_float("catchphrase_stroke_factor", 1.0)
    catchphrase_fill_color = _parse_choice("catchphrase_fill_color", {"white", "black"}, "white")
    font_key = request.form.get("font_key", DEFAULT_FONT_KEY)
    if font_key not in FONT_PRESETS:
        font_key = DEFAULT_FONT_KEY
    name_size_factor = _clamp(_parse_float("name_size_factor", 1.0), 0.7, 1.5)
    values = {"catchphrase": catchphrase, "name": name, "x_handle": x_handle}

    if photo is None or photo.filename == "":
        return render_template("index.html", error="写真ファイルを選択してください。", values=values), 400
    if not name:
        return render_template("index.html", error="名前を入力してください。", values=values), 400
    if not x_handle:
        return render_template("index.html", error="Xアカウントを入力してください。", values=values), 400

    temp_dir = Path(tempfile.mkdtemp(prefix="meishi-generator-"))
    suffix = Path(secure_filename(photo.filename)).suffix or ".png"
    photo_path = temp_dir / f"photo{suffix}"
    output_path = temp_dir / "meishi_cmyk.pdf"
    photo.save(photo_path)
    extra_images = _parse_extra_images(temp_dir)

    try:
        normalized_handle = normalize_x_handle(x_handle)
        generate_pdf(
            photo_path,
            catchphrase,
            name,
            normalized_handle,
            output_path,
            photo_offset=_parse_mm_pair("photo_offset_x_mm", "photo_offset_y_mm"),
            name_pos_mm=_parse_mm_pair("name_x_mm", "name_y_mm"),
            catchphrase_pos_mm=_parse_mm_pair("catchphrase_x_mm", "catchphrase_y_mm"),
            catchphrase_orientation=catchphrase_orientation,
            catchphrase_rotation_deg=catchphrase_rotation_deg,
            catchphrase_size_factor=catchphrase_size_factor,
            catchphrase_stroke_factor=catchphrase_stroke_factor,
            catchphrase_fill_color=catchphrase_fill_color,
            catchphrase_font_key=font_key,
            name_font_key=font_key,
            name_size_factor=name_size_factor,
            photo_scale=photo_scale,
            photo_rotation_deg=photo_rotation_deg,
            photo_brightness_factor=photo_brightness_factor,
            show_logo=show_logo,
            extra_images=extra_images,
        )
    except Exception:
        extra_paths = [extra["path"] for extra in extra_images if extra is not None]
        for path in (photo_path, output_path, *extra_paths):
            path.unlink(missing_ok=True)
        temp_dir.rmdir()
        raise

    pdf_bytes = output_path.read_bytes()

    def cleanup():
        extra_paths = [extra["path"] for extra in extra_images if extra is not None]
        for path in (photo_path, output_path, *extra_paths):
            path.unlink(missing_ok=True)
        temp_dir.rmdir()
    cleanup()

    return send_file(
        io.BytesIO(pdf_bytes),
        as_attachment=True,
        download_name=f"meishi_{safe_download_name(name)}_cmyk.pdf",
        mimetype="application/pdf",
    )


def _open_browser_when_ready() -> None:
    import time
    import urllib.request
    import webbrowser

    url = "http://127.0.0.1:5000/"
    for _ in range(40):  # 最大約10秒待つ
        try:
            urllib.request.urlopen(url, timeout=0.5)
            break
        except Exception:
            time.sleep(0.25)
    webbrowser.open(url)


if __name__ == "__main__":
    if getattr(sys, "frozen", False):
        import threading

        print("=" * 60)
        print("メスケモ推進委員会 名刺ジェネレーターを起動しています…")
        print("しばらくするとブラウザが自動で開きます。")
        print("終了するには、このウィンドウを閉じてください。")
        print("=" * 60)
        threading.Thread(target=_open_browser_when_ready, daemon=True).start()
    app.run(debug=False, port=5000)
