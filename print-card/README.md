# 名刺完全データ生成

アクセア定形名刺向けに、91mm x 55mm 仕上がり、各辺3mm塗り足し込みの 97mm x 61mm PDF を生成します。既存サイトのファイルは参照のみで、生成物は `print-card/` 配下に閉じています。

## 依存関係

- Python 3
- WeasyPrint
- qrcode / Pillow / pypdf
- Ghostscript（CMYK PDF からの PNG プレビュー生成に必須）
- フォント一式（`fonts/`。容量が大きい（otf/ttf込みで約76MB）ため Git 管理外にしている）

`fonts/` はリポジトリに含めていません。`python build.py` を実行すると `download_fonts()` が Noto Serif JP（noto-cjk）/ Zen Maru Gothic（Google Fonts）を自動ダウンロードして `fonts/` に配置します。手動での取得は不要です。

Ubuntu 例:

```sh
sudo apt install ghostscript
cd print-card
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python build.py
```

## 出力

- `output/meishi_mesukemo_rgb.pdf`: 確認用 RGB PDF
- `output/meishi_mesukemo_cmyk.pdf`: 入稿用 CMYK PDF
- `output/meishi_mesukemo_preview_front.png`: CMYK PDF 1ページ目から 350dpi で書き出した表面確認 PNG
- `output/meishi_mesukemo_preview_back.png`: CMYK PDF 2ページ目から 350dpi で書き出した裏面確認 PNG

`meishi_mesukemo_rgb.pdf` は HTML/CSS を WeasyPrint で書き出します。`meishi_mesukemo_cmyk.pdf` は同じ寸法、素材、座標を使って ReportLab で直接 CMYK PDF として生成します。どちらも1ページ目が表面、2ページ目が裏面です。Ghostscript 10.02 が WeasyPrint PDF のテキストを落とす環境があったため、入稿用は直接 CMYK 生成にしています。

## 印刷メモ

- ページサイズは 97mm x 61mm。仕上がり 91mm x 55mm に対し、各辺3mmの塗り足しをページサイズで表現しています。
- トンボは付けていません。
- 断裁位置は各辺3mm内側です。
- 安全エリアは各辺6mm内側、中央 85mm x 49mm です。文字、ロゴ、QR はこの範囲内に収めています。
- 背景はページ端まで敷き切っています。
- 金色 `#d4af37` は4色プロセス印刷では金属光沢になりません。Ghostscript の CMYK 変換後は画面上の RGB よりくすむ前提です。
- 入稿用 PDF 内の画像は `/DeviceCMYK` として埋め込み、文字色も CMYK 値で指定しています。
- Japan Color 2001 Coated ICC プロファイルを使った Ghostscript 変換ヘルパーは `build.py` に残していますが、標準フローでは直接 CMYK PDF を生成します。

## ロゴ解像度

`images/card-logo.png` は 410 x 409px です。名刺全面に使うには不足するため、20mm 角の小さいヘッダーマークとして配置しています。

実効dpi計算:

```text
409px / (20mm / 25.4) = 約519dpi
```

350dpiを上回っています。表示サイズを広げる場合は `build.py` の `LOGO_DISPLAY_MM` と CSS の `.logo` サイズを合わせて変更し、ビルド時の警告を確認してください。

## セルフチェック

`python build.py` は以下を検査します。

- PDF が2ページであること
- 各ページのサイズが 97mm x 61mm であること
- ロゴ表示サイズでの実効dpiが350dpi以上であること
- 表裏の PNG プレビューを RGB PDF ではなく CMYK PDF から作成すること
