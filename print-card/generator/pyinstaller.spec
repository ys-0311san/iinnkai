# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

block_cipher = None

GENERATOR_DIR = Path(SPECPATH)
PRINT_CARD_DIR = GENERATOR_DIR.parent
REPO_ROOT = PRINT_CARD_DIR.parent

datas = [
    (str(GENERATOR_DIR / "templates"), "print_bundle/generator/templates"),
    (str(GENERATOR_DIR / "static"), "print_bundle/generator/static"),
    (str(PRINT_CARD_DIR / "fonts"), "print_bundle/fonts"),
    (str(PRINT_CARD_DIR / "assets"), "print_bundle/assets"),
    (str(REPO_ROOT / "images" / "card-logo.png"), "print_bundle/images"),
]

a = Analysis(
    [str(GENERATOR_DIR / "app.py")],
    pathex=[str(GENERATOR_DIR), str(PRINT_CARD_DIR)],
    binaries=[],
    datas=datas,
    hiddenimports=[
        "PIL._tkinter_finder",
        "reportlab.pdfbase._fontdata",
    ],
    hookspath=[],
    runtime_hooks=[],
    excludes=["cv2", "weasyprint", "pymupdf", "fitz", "matplotlib", "tkinter"],
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="メスケモ名刺ジェネレーター",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
