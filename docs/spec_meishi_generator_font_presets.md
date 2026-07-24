# 名刺ジェネレーター（print-card/generator/）— フォントプリセット5種 + 名前・X IDのフォントサイズ調整

対象ディレクトリ: `print-card/generator/`（一部 `print-card/build.py` も編集）
[[spec_meishi_generator_photo_rotate_brightness.md]] [[spec_meishi_generator_extra_images.md]] で実装済みの機能には触れない。

対象ファイル:
- `print-card/build.py`（フォントダウンロード定義に3書体追加）
- `print-card/generator/app.py`（フォントアップロード廃止→プリセット選択に置き換え、フォント配信ルート追加）
- `print-card/generator/card_builder.py`（プリセットのフォント登録・選択ロジック、名前サイズ係数対応）
- `print-card/generator/templates/index.html`（`@font-face`、フォント選択UI、名前サイズスライダー）
- `print-card/generator/static/generator.js`（プレビュー側のフォント切替・名前サイズ係数）

---

## 前提: フォント選定（決定済み）

既存2書体 + 新規3書体、計5種。すべてOFLライセンス・Google Fonts (`google/fonts` リポジトリ `ofl/`) 配布・商用利用可・埋め込み可。実ファイル名は `gh api repos/google/fonts/contents/ofl/<dir>` で存在確認済み。

| キー | 表示名 | ファイル | 用途イメージ |
|---|---|---|---|
| `noto-serif-jp` | 明朝（デフォルト） | `NotoSerifJP-Bold.ttf`（既存・ダウンロード済み） | 現状のまま |
| `zen-maru-gothic` | 丸ゴシック | `ZenMaruGothic-Bold.ttf`（既存・ダウンロード済み） | やわらかい印象 |
| `zen-kaku-gothic-new` | 角ゴシック | `ZenKakuGothicNew-Bold.ttf`（新規） | すっきり・現代的 |
| `kaisei-decol` | 装飾明朝 | `KaiseiDecol-Bold.ttf`（新規） | エレガント・上品 |
| `yuji-syuku` | 筆文字 | `YujiSyuku-Regular.ttf`（新規・Regularのみ存在） | 和風・筆致演出 |

`YujiSyuku` はBold weightが存在しないため、Regularをそのまま使う（キャンバスやPILで`bold`指定しても実体は1書体しかないので自動的にRegularが使われる。これは正常な想定挙動でありバグではない）。

---

## 1. `print-card/build.py`

`FONT_URLS` に3エントリ追加する:

```python
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
```

既存の `download_fonts()` はこの辞書をループするだけなので変更不要（自動的に3ファイルもダウンロード対象になる）。`print-card/generator/app.py` は起動時に `download_fonts()` を呼んでいるので、サーバー起動時に自動取得される。

---

## 2. フォントプリセット共通定義（`card_builder.py`）

`CUSTOM_FONT_NAME` 定数と `_register_custom_font()` 関数、`_default_font_path()` 関数を**削除**し、以下に置き換える:

```python
FONT_PRESETS = {
    "noto-serif-jp":       {"file": "NotoSerifJP-Bold.ttf",      "pdf_name": "NotoSerifJP"},
    "zen-maru-gothic":     {"file": "ZenMaruGothic-Bold.ttf",    "pdf_name": "ZenMaruGothic"},
    "zen-kaku-gothic-new": {"file": "ZenKakuGothicNew-Bold.ttf", "pdf_name": "ZenKakuGothicNew"},
    "kaisei-decol":        {"file": "KaiseiDecol-Bold.ttf",      "pdf_name": "KaiseiDecol"},
    "yuji-syuku":          {"file": "YujiSyuku-Regular.ttf",     "pdf_name": "YujiSyuku"},
}
DEFAULT_FONT_KEY = "noto-serif-jp"


def _resolve_font_key(font_key: str | None) -> str:
    return font_key if font_key in FONT_PRESETS else DEFAULT_FONT_KEY


def _font_file_path(font_key: str) -> Path:
    return FONTS / FONT_PRESETS[_resolve_font_key(font_key)]["file"]


def _font_pdf_name(font_key: str) -> str:
    return FONT_PRESETS[_resolve_font_key(font_key)]["pdf_name"]


def _register_all_preset_fonts() -> None:
    for preset in FONT_PRESETS.values():
        pdfmetrics.registerFont(TTFont(preset["pdf_name"], str(FONTS / preset["file"])))
```

`_load_catchphrase_font(size, font_path=None)` は `font_path` が渡された場合そのまま使う（呼び出し側で `_font_file_path(font_key)` を渡すように変更するので、関数自体は変更不要）。

---

## 3. `card_builder.py` の呼び出し側の書き換え

- `generate_pdf()`:
  - 引数 `font_path: Path | None = None` を削除し、代わりに `catchphrase_font_key: str = DEFAULT_FONT_KEY`, `name_font_key: str = DEFAULT_FONT_KEY`, `name_size_factor: float = 1.0` を追加
    - **セリフ用とナンプレート/X ID用でキーを分ける必要はない**（今回はUI上「全体共通のプリセット選択」の決定のため、実際には同じ値が渡ってくる想定だが、関数シグネチャ上は分けておくと将来の拡張がしやすい。今回は `app.py` から常に同じ `font_key` を両方の引数に渡す実装でよい）
  - 冒頭の
    ```python
    pdfmetrics.registerFont(TTFont("NotoSerifJP", str(FONTS / "NotoSerifJP-Bold.ttf")))
    pdfmetrics.registerFont(TTFont("ZenMaruGothic", str(FONTS / "ZenMaruGothic-Bold.ttf")))
    front_font_name = _register_custom_font(font_path)
    front_font_path = font_path if front_font_name.startswith(CUSTOM_FONT_NAME) else None
    ```
    を
    ```python
    _register_all_preset_fonts()
    catchphrase_font_key = _resolve_font_key(catchphrase_font_key)
    name_font_key = _resolve_font_key(name_font_key)
    front_font_name = _font_pdf_name(name_font_key)
    front_font_path = _font_file_path(catchphrase_font_key)
    name_size_factor = _clamp_factor(name_size_factor, 0.7, 1.5)
    ```
    に置き換える（`_draw_back()` が使う `"ZenMaruGothic"` はこの一括登録で引き続き登録されるので、裏面には影響しない）
  - `_draw_front_signature(c, page_w, page_h, name.strip(), x_handle, name_pos_mm=name_pos_mm, font_name=front_font_name)` の呼び出しに `size_factor=name_size_factor` を追加（下記4章参照）
  - `_clamp_name_pos_mm(name.strip(), name_pos_mm, front_font_name)` の呼び出しにも `size_factor=name_size_factor` を渡す

- `build_custom_front()`: 引数 `font_path: Path | None` を `catchphrase_font_path: Path` に改名（実質は同じ用途）。呼び出し元の `generate_pdf()` から `front_font_path` を渡す

---

## 4. 名前・X IDのフォントサイズ調整（`card_builder.py`）

```python
NAME_FONT_SIZE_PT = 12.0        # ← 既存定数。size_factor適用前のベース値として維持
NAME_TEXT_HEIGHT_MM = 4.9       # ← 既存定数。同様にベース値として維持
```

- `_clamp_name_pos_mm(name, pos_mm, font_name="NotoSerifJP", size_factor=1.0)`:
  ```python
  def _clamp_name_pos_mm(name: str, pos_mm: tuple[float, float], font_name: str = "NotoSerifJP", size_factor: float = 1.0) -> tuple[float, float]:
      name_w_mm = pdfmetrics.stringWidth(name, font_name, NAME_FONT_SIZE_PT * size_factor) / mm_to_pt(1.0)
      return _clamp_text_box_mm(pos_mm, name_w_mm, NAME_TEXT_HEIGHT_MM * size_factor)
  ```
- `_draw_front_signature(c, page_w, page_h, name, x_handle, name_pos_mm=None, font_name="NotoSerifJP", size_factor=1.0)`:
  - `name_size = NAME_FONT_SIZE_PT * size_factor` に変更
  - `handle_size = 7.0 * size_factor` に変更
  - `handle_y = name_y + mm_to_pt(5.5 * size_factor)` に変更（名前とX IDの間隔もサイズに比例させる）
  - それ以外（オフセットの縁取り演出等）はそのまま

---

## 5. `generator.js`（プレビュー側）

### 5-a. フォントプリセット定義とactiveFontFamily()

`state.customFontFamily` / `state.fontLoadToken` / `loadCustomFont()` を**削除**し、以下に置き換える:

```js
const FONT_PRESETS = {
  'noto-serif-jp':       '"Noto Serif JP", "Yu Mincho", serif',
  'zen-maru-gothic':     '"Zen Maru Gothic", sans-serif',
  'zen-kaku-gothic-new': '"Zen Kaku Gothic New", sans-serif',
  'kaisei-decol':        '"Kaisei Decol", serif',
  'yuji-syuku':          '"Yuji Syuku", cursive',
};
const DEFAULT_FONT_KEY = 'noto-serif-jp';
```

`state.fontKey = DEFAULT_FONT_KEY` を追加。

```js
function activeFontFamily() {
  return FONT_PRESETS[state.fontKey] || FONT_PRESETS[DEFAULT_FONT_KEY];
}
```

- `inputs.font`（旧 `fontInput`）を `inputs.fontSelect = document.getElementById('fontSelect')` に置き換え、`change` イベントで `state.fontKey = inputs.fontSelect.value; drawPreview();`
- `updateHiddenInputs()` に `inputs.fontKey.value = state.fontKey;`（hidden input、5-cで追加）を追加

### 5-b. 名前・X IDのフォントサイズ

```js
const NAME_FONT_SIZE_MM = 4.23;   // 既存値をベースサイズとして維持
const NAME_TEXT_HEIGHT_MM = 4.9;
const HANDLE_FONT_SIZE_MM = 2.47;
const HANDLE_GAP_MM = 5.5;
```

`state.nameSizeFactor = 1` を追加。`nameMetrics()` を:

```js
function nameMetrics() {
  const text = inputs.name?.value || '';
  const fontPx = mmToPx(NAME_FONT_SIZE_MM * state.nameSizeFactor);
  ctx.save();
  ctx.font = `bold ${fontPx}px ${activeFontFamily()}`;
  const measured = ctx.measureText(text || '名前');
  ctx.restore();
  return {
    text,
    w: measured.width,
    h: mmToPx(NAME_TEXT_HEIGHT_MM * state.nameSizeFactor),
    fontPx,
  };
}
```

`drawSignature()` 内の `ctx.font = \`bold ${mmToPx(2.47)}px ${activeFontFamily()}\`` と `handleY = y - mmToPx(5.5)` を、それぞれ `mmToPx(HANDLE_FONT_SIZE_MM * state.nameSizeFactor)` / `y - mmToPx(HANDLE_GAP_MM * state.nameSizeFactor)` に変更する。

- 新しいスライダー `nameSizeSlider`（min=70, max=150, step=1, value=100）の `input` イベントで `state.nameSizeFactor = Number(value) / 100; drawPreview();`
- `updateHiddenInputs()` に `inputs.nameSizeFactor.value = state.nameSizeFactor.toFixed(3);` を追加

### 5-c. hidden input

```html
<input type="hidden" id="fontKeyInput" name="font_key" value="noto-serif-jp">
<input type="hidden" id="nameSizeFactorInput" name="name_size_factor" value="1">
```

---

## 6. `templates/index.html`

### 6-a. `@font-face`（`<style>` 内、先頭付近に追加）

```css
@font-face { font-family: "Noto Serif JP"; src: url("/assets/fonts/NotoSerifJP-Bold.ttf") format("truetype"); font-weight: 700; }
@font-face { font-family: "Zen Maru Gothic"; src: url("/assets/fonts/ZenMaruGothic-Bold.ttf") format("truetype"); font-weight: 700; }
@font-face { font-family: "Zen Kaku Gothic New"; src: url("/assets/fonts/ZenKakuGothicNew-Bold.ttf") format("truetype"); font-weight: 700; }
@font-face { font-family: "Kaisei Decol"; src: url("/assets/fonts/KaiseiDecol-Bold.ttf") format("truetype"); font-weight: 700; }
@font-face { font-family: "Yuji Syuku"; src: url("/assets/fonts/YujiSyuku-Regular.ttf") format("truetype"); font-weight: 400; }
```

これにより、これまで「指定はしていたが実体が無く実質フォールバックのserif/sans-serifで描画されていた」プレビューが、実際にPDFと同じ書体で見えるようになる（既存のNoto Serif JP / Zen Maru Gothicについても、このタイミングで初めてプレビューが正しい書体で表示されるようになる。これは今回のバグ修正を兼ねた副作用であり、意図した変更）。

### 6-b. フォント選択UI

既存の
```html
<label>
  フォント（任意）
  <input id="fontInput" type="file" name="font" accept=".ttf,.otf">
</label>
```
を削除し、以下に置き換える:

```html
<label>
  フォント
  <select id="fontSelect" name="font_key_select">
    <option value="noto-serif-jp" selected>明朝（Noto Serif JP）</option>
    <option value="zen-maru-gothic">丸ゴシック（Zen Maru Gothic）</option>
    <option value="zen-kaku-gothic-new">角ゴシック（Zen Kaku Gothic New）</option>
    <option value="kaisei-decol">装飾明朝（Kaisei Decol）</option>
    <option value="yuji-syuku">筆文字（Yuji Syuku）</option>
  </select>
</label>
```

（`name="font_key_select"` はJS制御下の見た目用select。実際にサーバーへ送信されるのは `updateHiddenInputs()` が同期する `<input type="hidden" name="font_key">` の方なので、select自体に `name` を付けても付けなくても実害はないが、フォーム内で重複しない名前にしておくこと）

### 6-c. 名前サイズスライダー

「名前」入力欄の近く、またはプレビューパネルの署名関連コントロール群に追加:

```html
<label class="catchphrase-control">
  名前・X IDの文字サイズ
  <input type="range" id="nameSizeSlider" min="70" max="150" value="100" step="1">
</label>
```

---

## 7. `app.py`

- `font = request.files.get("font")` および font保存関連のコード（`font_suffix`, `font_path`, `font.save(font_path)`）を**削除**
- 代わりに:
  ```python
  from card_builder import FONT_PRESETS, DEFAULT_FONT_KEY
  ...
  font_key = request.form.get("font_key", DEFAULT_FONT_KEY)
  if font_key not in FONT_PRESETS:
      font_key = DEFAULT_FONT_KEY
  name_size_factor = _clamp(_parse_float("name_size_factor", 1.0), 0.7, 1.5)
  ```
- `generate_pdf(...)` 呼び出しから `font_path=font_path` を削除し、`catchphrase_font_key=font_key, name_font_key=font_key, name_size_factor=name_size_factor` を追加
- 例外時・成功時のクリーンアップ処理から `font_path` への言及を削除（もうこの変数は存在しない）

### 7-a. フォント配信ルート（プレビューの`@font-face`用）

```python
FONT_ASSET_FILES = {preset["file"] for preset in FONT_PRESETS.values()}

@app.get("/assets/fonts/<path:filename>")
def font_asset(filename: str):
    if filename not in FONT_ASSET_FILES:
        abort(404)
    return send_file(ROOT.parent / "fonts" / filename)
```

`abort` は `flask` から追加importすること（`from flask import Flask, abort, render_template, request, send_file`）。**必ずホワイトリスト（`FONT_ASSET_FILES`）との完全一致チェックを行うこと**（パストラバーサル対策。`secure_filename()`だけに頼らない）。

---

## 8. 動作確認の観点

1. サーバー起動時に3書体が自動ダウンロードされ、`print-card/fonts/` に `ZenKakuGothicNew-Bold.ttf` / `KaiseiDecol-Bold.ttf` / `YujiSyuku-Regular.ttf` が生成されること
2. `http://127.0.0.1:5000/assets/fonts/NotoSerifJP-Bold.ttf` 等にブラウザ/curlでアクセスしてファイルが返ること。`/assets/fonts/../../app.py` のような不正パスは404になること
3. フォント選択プルダウンで5種を切り替えると、プレビューのセリフ・名前・X IDの書体が実際に変わること（これまでのようにフォールバック書体のままにならないこと）
4. 名前サイズスライダーを70%/150%双方向に動かし、名前とX IDの両方が連動して拡大縮小し、安全マージン内にクランプされること
5. フォーム送信 → 生成PDFの書体・名前サイズが、プレビューと一致していること
6. デフォルト状態（プリセット=明朝、サイズ=100%）で送信した場合、[[spec_meishi_generator_extra_images.md]] 実装後の出力と見た目が変わらないこと（回帰確認）
7. 既存の `font` アップロードUIが完全に消えていること、旧 `fontInput` への参照がJS/HTML双方に残っていないこと
