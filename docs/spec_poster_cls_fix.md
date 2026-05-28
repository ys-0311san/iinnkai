# spec: ポスター読み込み時レイアウトシフト（CLS）修正

## 背景・問題

`events` タブのポスター画像（`.poster-block picture`）は `loading="lazy"` で遅延読み込みされる。
PC 幅（min-width: 768px）での CSS が下記になっており、`width: auto` が原因でレイアウトシフトが発生している。

```css
/* 現状（問題あり） */
.poster-block picture {
    width: auto;
    max-width: 48%;
    max-height: calc(100vh - 220px);
    flex-shrink: 0;
}
```

`width: auto` は flex-row コンテナ内でコンテンツサイズに依存するため、**画像が未ロードの間は picture 幅が 0px** になる。
その結果、ページ描画時は `.poster-description` が全幅を占有し、画像ロード完了後に picture が正規幅（最大 48%）まで膨らむ。
この膨張が「配置が変わってちかちかする」現象の正体。

## 修正対象ファイル

- `style.css` のみ

## 修正内容

### 1. PC 幅での picture サイズを安定化

**対象セレクター：**  
`@media (min-width: 768px)` 内の `.poster-block picture` ブロック

**現在：**
```css
@media (min-width: 768px) {
    .poster-image {
        width: 100%;
        height: 100%;
        max-height: none;
        object-fit: contain;
    }
    .poster-block picture {
        width: auto;
        max-width: 48%;
        max-height: calc(100vh - 220px);
        flex-shrink: 0;
    }
}
```

**修正後：**
```css
@media (min-width: 768px) {
    .poster-image {
        width: 100%;
        height: 100%;
        max-height: none;
        object-fit: contain;
    }
    .poster-block picture {
        flex: 0 0 42%;          /* 画像ロード前から幅を固定 */
        width: 42%;             /* aspect-ratio の計算基準を安定させる */
        max-height: calc(100vh - 220px);
    }
}
```

**変更の意図：**
- `flex: 0 0 42%` = grow しない・shrink しない・flex-basis 42%。幅がロード状態に依存しなくなる
- `width: 42%` を明示することで `aspect-ratio: 1448 / 2048` が正しく高さを計算できる
- `flex-shrink: 0` は `flex: 0 0 42%` の中に含まれるため削除
- `max-width: 48%` は不要になるため削除（flex-basis で固定されているため）
- `max-height: calc(100vh - 220px)` はポスターが画面を超えないよう残す

## 修正しない範囲

- スマートフォン幅（max-width: 767px）の `.poster-block picture` → `width: 100%` で既に安定しているため変更不要
- `.special-event-card picture` → 別のセレクターなので影響なし
- `script.js` の `initPosterSkeletons()` → ロジックは正しいため変更不要

## 動作確認ポイント

1. PC 幅でイベントタブを開いたとき、ポスターエリアが最初から正しい幅を確保している
2. 画像ロード中はシマーアニメーションが表示される
3. 画像ロード完了後、スムーズにフェードインする（配置の変化なし）
4. スマートフォン幅ではポスターが全幅で縦並びになる（変化なし）
