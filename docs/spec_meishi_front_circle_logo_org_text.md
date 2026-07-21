# 名刺 表面: 横長バナーロゴを廃止し「丸ロゴ（左下・半透明）」＋「団体名テキスト（右下）」に変更

## 背景

`print-card/` の名刺表面は現在、右下コーナーに「yuki__san」（名前・上）＋
`images/header-banner.png`（横長バナーロゴ・下）を右揃えで安全エリアの角に
ぴったり配置している。

横長のバナーロゴは小さいコーナーに収めると相性が悪い（間延びして見える）ため、
以下の2点に変更する。

1. **横長バナーロゴ（`header-banner.png`）を廃止**し、代わりに裏面で使っている
   **丸ロゴ（`images/card-logo.png`）を表面の左下に、不透明度75%で** 配置する
2. **右下コーナーの「yuki__san」の下に添えていたバナーロゴの代わりに、
   裏面で使っている団体名テキスト「メスケモ推進委員会」を配置する**
   （名前が上、団体名テキストが下、という現行の並び順・右揃え・安全エリア角に
   ぴったり接する配置はそのまま踏襲する）

`print-card/` 以外のファイルには一切手を加えないこと。背景写真のクロップ・
下部スクリム・裏面のレイアウトは変更しない。

## 変更詳細

### 1. 左下の丸ロゴ（新規追加）

- 素材: `images/card-logo.png`（裏面で使っているものと同じファイル）
- 配置: 表面の安全エリア左下の角に、マージンなしでぴったり接する
  （= 右下の名前ブロックが安全エリア右下にぴったり接しているのと対になる配置）
- サイズ: 幅20mm程度（正方形想定、裏面の24mmよりやや小さめ）。
  実際に生成して背景写真とのバランスを見て微調整してよい
- 不透明度: **75%**（背景写真にうっすら透ける半透明の焼き印のような見え方にする）
- 実装場所: `print-card/generate_background.py` の `build_front_from_photo()` 内、
  `add_bottom_scrim(front)` の後に、`card-logo.png` を読み込んでアルファチャンネルを
  75%にスケールした上で `alpha_composite` で合成する。
  これにより `card-bg-front.png` / `card-bg-front-cmyk.jpg` 側に焼き込まれるため、
  `card.html` にも `build.py` の直描画側にも個別の画像タグ・drawImage 呼び出しは
  追加不要（背景画像1枚で完結する）

### 2. 右下の団体名テキスト（バナーロゴを置き換え）

- 内容: 「メスケモ推進委員会」（裏面の団体名と同一の文言）
- フォント: 裏面の `.organization` と同じ `NotoSerifJP` Bold を使う
- サイズ: 名前「yuki__san」（12pt）より控えめな 9〜9.5pt 程度
  （名前が主役、団体名テキストは補助的な位置づけを維持する）
- 配置: 現行のバナーロゴと同じ位置関係（名前の下、gap 1mm程度）、右揃え、
  安全エリア右下にぴったり接する現行の配置ロジックをそのまま流用する
- コントラスト: 背景が写真のため、名前と同様に十分なコントラストを確保すること
  （`card.css` は `.name` と同様の `text-shadow`、`build.py` は `.name`／`yuki__san`
  描画で使っている二重シャドウ＋オフホワイト塗りの手法をそのまま流用してよい）
- 字間の演出（裏面の `setCharSpace` のような特殊な字間調整）は不要。素のテキストでよい

## 実装方針（ファイル別）

### `print-card/generate_background.py`
- `build_front_from_photo()` に、丸ロゴを左下に75%不透明度で合成する処理を追加する
  （`LOGO` 定数は既に `card-logo.png` を指しているのでそのまま使える）

### `print-card/card.html`
- `.front-footer` 内の `<img class="banner-logo" ...>` を削除し、
  代わりに `<p class="org-text">メスケモ推進委員会</p>` を `.name` の下に追加する

### `print-card/card.css`
- `.banner-logo` ルールを削除する
- `.org-text` を新規追加する（フォント・サイズ・色・text-shadow・右揃えは上記の通り）
- `.front-footer` の `gap` は必要に応じて調整してよい

### `print-card/build.py`
- `write_cmyk_pdf_direct()` 内、`header-banner-cmyk.jpg` を `drawImage` している
  ブロックを削除し、代わりに「メスケモ推進委員会」テキストを描画する処理に置き換える。
  `signature_x`（安全エリア右端）を基準にした右揃え、`name_y` の下に配置するロジックは
  現行の `banner_x`/`banner_y` 計算と同じ考え方を踏襲する
- `build_background()` 内、`header-banner-cmyk.jpg` を生成している処理
  （`Image.open(REPO_ROOT / "images" / "header-banner.png")...` の行）は
  使われなくなるため削除する
- 未使用になった `HEADER_BANNER_DISPLAY_MM` 定数を削除する
- `LOGO_DISPLAY_MM`（裏面の丸ロゴ用）や `check_logo_dpi()` は変更不要
  （表面の丸ロゴは裏面より小さいサイズで使うため、既存のDPIチェックより余裕がある）

## セルフチェック

- `python build.py` が正常終了し、2ページのRGB・CMYK PDFが61mm×97mmで出力されること
- 表面プレビューで、横長バナーロゴが跡形もなく消えていること
- 表面プレビューで、丸ロゴが左下の安全エリア角にぴったり接し、背景に薄く透けて見えること
  （75%不透明度が視覚的に確認できること）
- 表面プレビューで、「yuki__san」の下に「メスケモ推進委員会」が右揃え・安全エリア右下角に
  ぴったり接して配置され、写真の上でも十分読めるコントラストがあること
- 裏面のレイアウト・フレーム・団体名の中心揃えは前回から変更されていないこと
- CMYK PDF内の画像がすべて `/DeviceCMYK` であること
- `header-banner.png` / `header-banner-cmyk.jpg` 関連の未使用コードが残っていないこと

## 出力

- `print-card/output/meishi_mesukemo_cmyk.pdf`
- `print-card/output/meishi_mesukemo_rgb.pdf`
- `print-card/output/meishi_mesukemo_preview_front.png`
- `print-card/output/meishi_mesukemo_preview_back.png`
