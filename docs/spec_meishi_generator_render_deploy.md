# 名刺ジェネレーター Render無料デプロイ仕様書

## 目的
`print-card/generator/`（Flaskローカル名刺ジェネレーター）を、無料ホスティングサービス **Render**（クレジットカード登録不要の Free プラン）にデプロイし、URLひとつでメンバー全員に共有できるようにする。既存の `.exe` 配布フローは変更しない。

## 前提・制約
- `print-card/build.py` / `print-card/generate_background.py` には**一切手を加えない**（yuki__san本人の名刺印刷パイプライン保護のため）。
- `print-card/requirements.txt`（ルート）は `weasyprint` / `opencv-contrib-python-headless` / `pymupdf` など重い依存を含み、これは `build.py` 用。今回のWeb配布ではこれらは不要（`print-card/generator/print_assets.py` は `pikepdf`, `qrcode`, `PIL`, `fontTools` のみに依存し、`_ensure_assets()` 内の `generate_background.build_backgrounds()`（opencv依存）は `assets/card-bg-back-cmyk.jpg` と `assets/header-banner-cmyk.jpg` が既にリポジトリにコミット済みのため実行時には呼ばれない）。よって generator専用の軽量な requirements ファイルを新規作成すること。
- Render Free プランはクレジットカード登録不要。ただし15分アクセスが無いとスリープし、次のアクセス時に再起動で数十秒待つ（コスト$0とのトレードオフとして許容する）。
- `images/card-logo.png`（リポジトリルート直下）は既にコミット済みで、`print_assets.py` の `LOGO = REPO_ROOT / "images" / "card-logo.png"` はファイルパスの絶対解決なので Render の `rootDir` 設定に関係なく機能する。

## 実装内容

### 1. 新規ファイル: `print-card/generator/requirements.txt`
generatorが実際に import するものだけを列挙する軽量版（バージョンピン無しでルートのrequirements.txtに準拠）:
```
Flask
pillow
reportlab
fonttools
qrcode[pil]
pikepdf
gunicorn
```

### 2. 新規ファイル: `print-card/generator/wsgi.py`
gunicornはPythonスクリプトとしてではなくモジュールとして `app.py` をimportするため、`app.py` が期待する「スクリプト実行時に自動でスクリプト自身のディレクトリがsys.path[0]に入る」という前提が壊れる（`card_builder.py` 内の `from print_assets import (...)` が解決できなくなる）。これを避けるため、明示的にgenerator自身のディレクトリをsys.pathに積んでから `app` をimportするWSGIエントリポイントを作る:

```python
#!/usr/bin/env python3
"""Render等のWSGIホスティング用エントリポイント。
gunicornはモジュールとしてimportするため、app.py実行時の暗黙のsys.path挿入
（スクリプト自身のディレクトリ）が起きない。ここで明示的に積んでから app を読む。
"""
from __future__ import annotations

import sys
from pathlib import Path

GENERATOR_DIR = Path(__file__).resolve().parent
if str(GENERATOR_DIR) not in sys.path:
    sys.path.insert(0, str(GENERATOR_DIR))

from app import app  # noqa: E402,F401
```

### 3. 新規ファイル: `render.yaml`（リポジトリルート）
Render Blueprintとして、ダッシュボードでの手動設定ミスを避ける:
```yaml
services:
  - type: web
    name: meishi-generator
    runtime: python
    plan: free
    region: singapore
    rootDir: print-card/generator
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.9
```
補足：
- `workers 1` にするのはRender Freeプランのメモリ上限（512MB）を考慮したもの（`app.py`起動時に呼ばれる`download_fonts()`が複数workerで同時実行されるレースも避けられる）。
- `timeout 120` はコールドスタート直後にフォントダウンロード（`download_fonts()`、GitHub raw から5ファイル取得）が走っても最初のリクエストがタイムアウトしないようにするため。
- `region: singapore` は日本から地理的に近いRenderのリージョン。他リージョンでも動作に支障はない。

### 4. 既存ファイル編集: `.gitignore`（Claude側で適用、Codexは触らない）
`print-card/generator/build/` と `print-card/generator/dist/`（PyInstallerの成果物、現在未追跡）を追加する。この変更はCodexの担当外、Claudeが直接編集する。

### 5. 既存ファイル編集: `print-card/generator/README.md`（Claude側で適用、Codexは触らない）
現在ローカル起動手順のみ記載されている。末尾に以下のセクションを追記する内容を提案してほしい（本文はCodexが提案し、Claudeが反映する）:
- RenderへのデプロイURL共有についての説明（GitHubリポジトリと連携してrender.yamlのBlueprintから作成する手順）
- 初回アクセス時にスリープから復帰する場合、数十秒待つ旨の注意書き

## 変更してはいけないもの
- `print-card/build.py`
- `print-card/generate_background.py`
- `print-card/requirements.txt`（ルート）
- `print-card/generator/app.py` の既存ロジック（`if __name__ == "__main__":` 以下のexe用ローカル起動処理はそのまま。gunicorn経由では実行されないため変更不要）
- `print-card/generator/card_builder.py`

## 成果物として作ってほしいもの（Codexの担当）
1. `print-card/generator/requirements.txt`（新規）
2. `print-card/generator/wsgi.py`（新規）
3. `render.yaml`（新規、リポジトリルート）
4. `print-card/generator/README.md` に追記すべきデプロイ手順のテキスト案（既存ファイルへの直接編集はせず、追記案を出力してください。Claudeが反映します）
