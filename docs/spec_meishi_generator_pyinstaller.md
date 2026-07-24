# 名刺ジェネレーター（print-card/generator/）— PyInstaller .exe 化対応

## 目的

`print-card/generator/` をPyInstallerで単一.exe化し、他メンバーがダブルクリックだけで
起動できるようにする。[[spec_meishi_generator_slim_deps.md]] で重い依存（opencv/weasyprint）は
既に排除済み。今回はPyInstallerでフリーズした状態でも正しく動くよう、パス解決とブラウザ自動起動を対応する。

対象:
- `print-card/generator/print_assets.py`（パス解決をfrozen対応に）
- `print-card/generator/app.py`（Flaskのtemplate/static folder指定、frozen判定でのpath解決、ブラウザ自動起動）
- 新規: `print-card/generator/pyinstaller.spec`
- `print-card/build.py` / `print-card/generate_background.py` には一切触れない

---

## 1. `print_assets.py` — frozen対応のパス解決

冒頭に `import sys` を追加し、`ROOT` の決定ロジックを以下に変更する:

```python
if getattr(sys, "frozen", False):
    # PyInstaller (--onefile) でビルドされた場合、バンドルされたデータは
    # 一時展開ディレクトリ sys._MEIPASS 以下に "print_bundle/" というプレフィックスで置く
    # （後述のspecファイルのdatas設定と対応させる）
    BASE_DIR = Path(sys._MEIPASS) / "print_bundle"  # type: ignore[attr-defined]
    ROOT = BASE_DIR  # ここでの ROOT は「print-card/」相当のバンドル内ディレクトリ
    REPO_ROOT = BASE_DIR  # images/ もこの下にバンドルする（後述）
else:
    ROOT = Path(__file__).resolve().parents[1]  # print-card/
    REPO_ROOT = ROOT.parent
```

これに伴い、直後の
```python
ASSETS = ROOT / "assets"
FONTS = ROOT / "fonts"
LOGO = REPO_ROOT / "images" / "card-logo.png"
```
はそのままでよい（`ROOT`/`REPO_ROOT` が上で切り替わっているので自動的に正しいパスになる）。

さらに、Flask用に以下2つの定数を追加する（`app.py`から使う）:

```python
GENERATOR_DIR = (Path(sys._MEIPASS) / "print_bundle" / "generator") if getattr(sys, "frozen", False) else Path(__file__).resolve().parent  # type: ignore[attr-defined]
TEMPLATES_DIR = GENERATOR_DIR / "templates"
STATIC_DIR = GENERATOR_DIR / "static"
```

**重要**: frozen時、`FONTS`/`ASSETS`/`LOGO` はPyInstallerがバンドルした**読み取り専用**の一時ディレクトリを指すことになる。
`download_fonts()` は `dest.exists()` を見てスキップする実装なので、バンドルに全フォントファイルが含まれていれば
ネットワークアクセスなしでそのまま動く（後述のspecファイルで全フォントを同梱するので問題ない）。
同様に `_ensure_assets()`（`card_builder.py`側、変更不要）も、`card-bg-back-cmyk.jpg` 等がバンドルに含まれていれば
`generate_background.build_backgrounds()` の遅延importには到達しない。

---

## 2. `app.py` — Flaskのtemplate/static指定とブラウザ自動起動

### 2-a. Flaskインスタンスの初期化

現在:
```python
app = Flask(__name__)
```
を、`print_assets` から `TEMPLATES_DIR`, `STATIC_DIR`, `ASSETS`, `FONTS`, `LOGO` をimportした上で:
```python
app = Flask(
    __name__,
    template_folder=str(TEMPLATES_DIR),
    static_folder=str(STATIC_DIR),
)
```
に変更する。

### 2-b. `card_logo()` / `font_asset()` ルートのパス修正

現在 `app.py` は独自に `ROOT = Path(__file__).resolve().parents[1]` を計算し、
`card_logo()` で `ROOT.parent / "images" / "card-logo.png"`、`font_asset()` で `ROOT / "fonts" / filename` を参照している。
これをそれぞれ `print_assets` からimportした `LOGO` と `FONTS / filename` に置き換える
（frozen時にも正しいパスを指すようにするため）:

```python
@app.get("/assets/card-logo.png")
def card_logo():
    return send_file(LOGO, mimetype="image/png")


@app.get("/assets/fonts/<path:filename>")
def font_asset(filename: str):
    if filename not in FONT_ASSET_FILES:
        abort(404)
    return send_file(FONTS / filename)
```

（既存の `sys.path.insert(0, str(ROOT))` 行は、frozen時は不要だが実行しても害はないのでそのまま残してよい。
ただし `ROOT` 変数自体は `print_assets` の値と重複するのでこの用途専用に残すか、importを整理して構わない。
迷った場合は元の `ROOT = Path(__file__).resolve().parents[1]` はそのまま残し、`sys.path.insert` にだけ使う変数として維持してよい）

### 2-c. ブラウザ自動起動 + 終了案内

ファイル末尾の
```python
if __name__ == "__main__":
    app.run(debug=False, port=5000)
```
を以下に変更する:

```python
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
```

（`sys` は既に `app.py` の先頭でimport済みなのでそのまま使う）

---

## 3. `print-card/generator/pyinstaller.spec` の新規作成

以下の内容で新規作成する（PyInstallerの標準的な `.spec` 形式。`Analysis`/`PYZ`/`EXE`の3点構成）:

```python
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
```

**注意点**:
- `datas` のタプル第2要素（バンドル内の配置先パス）は、`print_assets.py` の `BASE_DIR = Path(sys._MEIPASS) / "print_bundle"` という前提と**完全に一致させる**こと（`print_bundle/generator/templates`, `print_bundle/generator/static`, `print_bundle/fonts`, `print_bundle/assets`, `print_bundle/images` の5つ）
- `excludes` に `cv2`, `weasyprint`, `pymupdf`, `fitz` を明示することで、万が一これらが依存グラフに紛れ込んでも除外され、.exeサイズが不必要に膨らむのを防ぐ（[[spec_meishi_generator_slim_deps.md]] で実import経路からは既に排除済みのはずだが、念のための保険）
- `console=True` にしているのは、非技術者でも「このウィンドウを閉じれば終了」という分かりやすい終了操作を提供するため（意図的な選択。`console=False`にしない）

---

## 4. requirements（参考・このタスクでは変更不要）

ビルド前に `pip install pyinstaller flask pillow reportlab fonttools pikepdf qrcode werkzeug` が
Windows側Python環境に入っている必要がある（既存の `print-card/requirements.txt` は
weasyprint/opencv/pymupdf等重いものを含むフルセットなので、.exeビルド用には使わない）。
このタスクではrequirements整理は行わず、コード変更とspecファイル作成のみ行う。

---

## 5. 動作確認の観点（Codex側で可能な範囲）

1. `python -m py_compile print-card/generator/app.py print-card/generator/print_assets.py` が通ること
2. 非frozen時（通常の `python generator/app.py` 起動）の挙動が今までと完全に同じであること（`getattr(sys, "frozen", False)` は通常実行時は常に `False` なので、既存の分岐に影響しないことを確認）
3. `print-card/build.py` / `print-card/generate_background.py` に差分が無いこと
4. 実際の `.exe` ビルド・実機確認は、Windows側Python環境が必要なため、この場では行わなくてよい（別途実施する）
