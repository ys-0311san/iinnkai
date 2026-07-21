#!/usr/bin/env python3
from __future__ import annotations

import io
import tempfile
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from flask import Flask, render_template, request, send_file
from werkzeug.utils import secure_filename

from card_builder import generate_pdf, normalize_x_handle, safe_download_name
from build import download_fonts


app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 40 * 1024 * 1024
download_fonts()


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


def _parse_choice(name: str, choices: set[str], fallback: str) -> str:
    value = request.form.get(name, fallback)
    return value if value in choices else fallback


@app.get("/")
def index():
    return render_template("index.html", error=None, values={})


@app.get("/assets/card-logo.png")
def card_logo():
    return send_file(ROOT.parent / "images" / "card-logo.png", mimetype="image/png")


@app.post("/generate")
def generate():
    photo = request.files.get("photo")
    font = request.files.get("font")
    catchphrase = request.form.get("catchphrase", "").strip()
    name = request.form.get("name", "").strip()
    x_handle = request.form.get("x_handle", "").strip()
    show_logo = request.form.get("show_logo") is not None
    photo_scale = _parse_float("photo_scale", 1.0)
    catchphrase_orientation = _parse_choice("catchphrase_orientation", {"vertical", "horizontal"}, "vertical")
    catchphrase_rotation_deg = _parse_float("catchphrase_rotation_deg", 0.0)
    catchphrase_size_factor = _parse_float("catchphrase_size_factor", 1.0)
    catchphrase_stroke_factor = _parse_float("catchphrase_stroke_factor", 1.0)
    catchphrase_fill_color = _parse_choice("catchphrase_fill_color", {"white", "black"}, "white")
    values = {"catchphrase": catchphrase, "name": name, "x_handle": x_handle}

    if photo is None or photo.filename == "":
        return render_template("index.html", error="写真ファイルを選択してください。", values=values), 400
    if not catchphrase:
        return render_template("index.html", error="セリフを入力してください。", values=values), 400
    if not name:
        return render_template("index.html", error="名前を入力してください。", values=values), 400
    if not x_handle:
        return render_template("index.html", error="Xアカウントを入力してください。", values=values), 400

    temp_dir = Path(tempfile.mkdtemp(prefix="meishi-generator-"))
    suffix = Path(secure_filename(photo.filename)).suffix or ".png"
    photo_path = temp_dir / f"photo{suffix}"
    font_path = None
    if font is not None and font.filename:
        font_suffix = Path(secure_filename(font.filename)).suffix.lower()
        if font_suffix in {".ttf", ".otf"}:
            font_path = temp_dir / f"font{font_suffix}"
    output_path = temp_dir / "meishi_cmyk.pdf"
    photo.save(photo_path)
    if font_path is not None:
        font.save(font_path)

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
            font_path=font_path,
            photo_scale=photo_scale,
            show_logo=show_logo,
        )
    except Exception:
        for path in (photo_path, font_path, output_path):
            if path is not None:
                path.unlink(missing_ok=True)
        temp_dir.rmdir()
        raise

    pdf_bytes = output_path.read_bytes()

    def cleanup():
        for path in (photo_path, font_path, output_path):
            if path is not None:
                path.unlink(missing_ok=True)
        temp_dir.rmdir()
    cleanup()

    return send_file(
        io.BytesIO(pdf_bytes),
        as_attachment=True,
        download_name=f"meishi_{safe_download_name(name)}_cmyk.pdf",
        mimetype="application/pdf",
    )


if __name__ == "__main__":
    app.run(debug=False, port=5000)
