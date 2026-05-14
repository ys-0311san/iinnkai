/* ===========================
   会員カードジェネレーター
   写真アップロード・位置調整・カード描画・ダウンロード
   =========================== */

'use strict';

/* ===========================
   カード寸法定数
   プレビューcanvasとカードcanvasで同じ定数を使うことで表示を一致させる
   =========================== */
const CARD_W = 1024;
const CARD_H = 650;

// 左パネル幅（写真エリアを含む）
const LEFT_W = 330;

// ボトムストリップ（先に定義してPHOTO_Yの計算で使う）
const STRIP_Y  = 510;
const STRIP_H  = CARD_H - STRIP_Y;  // = 140

// 写真エリア（カード上の実際の位置・サイズ）
// ★ プレビューcanvasもこのサイズにすることで描画内容を完全一致させる
// PHOTO_Y: ストリップを除いたコンテンツ領域(0〜STRIP_Y)内で垂直中央
const PHOTO_W = 280;
const PHOTO_H = 380;
const PHOTO_X = Math.round((LEFT_W - PHOTO_W) / 2);               // 左パネル内で水平中央 = 25
const PHOTO_Y = Math.round((STRIP_Y - PHOTO_H) / 2);              // コンテンツ領域内で垂直中央 = 65

// 右情報エリア
const INFO_X   = LEFT_W + 35;   // = 365
const INFO_W   = CARD_W - INFO_X - 30;  // = 629

/* ===========================
   写真状態管理
   =========================== */
let photoImage  = null;
/** カードフッターに表示するロゴ画像 */
let cardLogoImage = null;
let photoScale = 1.0;
let photoX     = 0;
let photoY     = 0;
let isDragging  = false;
let dragStartX  = 0;
let dragStartY  = 0;

/* ===========================
   背景画像状態管理
   =========================== */
/** 現在選択中の背景画像（null = グラデーション or 単色） */
let bgImage      = null;
/** 現在選択中の単色カラー（null = グラデーション or 画像） */
let bgColor      = null;
/** 現在選択中の背景ID */
let selectedBgId = 'none';

/* ===========================
   背景オプション定義
   画像を追加する場合はここにエントリを追加するだけでよい
   src: null → グラデーション（デフォルト）
   src: 'パス' → 画像ファイル
   =========================== */
const BG_OPTIONS = [
    // デフォルト（テーマ別グラデーション）
    { id: 'none',     label: 'グラデーション',   src: null },

    // 各ページの背景画像
    { id: 'about',    label: 'イベント',         src: 'images/bg-about-pc.png' },
    { id: 'cast',     label: 'キャスト',         src: 'images/bg-cast-pc.png' },
    { id: 'official', label: '公式サイト',       src: 'images/bg-official-pc.png' },

    // 単色カラー
    { id: 'c-black',   label: '黒',             color: '#080808' },
    { id: 'c-charcoal',label: 'チャコール',      color: '#2a2a2a' },
    { id: 'c-navy',    label: 'ネイビー',        color: '#0a0e1f' },
    { id: 'c-purple',  label: 'ディープパープル', color: '#1a0a2e' },
    { id: 'c-forest',  label: 'フォレスト',      color: '#0a1f0f' },
    { id: 'c-wine',    label: 'ワイン',          color: '#2e0a14' },
    { id: 'c-brown',   label: 'こげ茶',          color: '#1f1008' },
    { id: 'c-teal',    label: 'ティール',        color: '#081f1f' },
    { id: 'c-white',   label: 'グレー',          color: '#808080' },
    { id: 'c-cream',   label: 'クリーム',        color: '#b0a898' },
    { id: 'c-pink',    label: 'ピンク',          color: '#c07898' },
    { id: 'c-sky',     label: 'スカイブルー',    color: '#6898be' },
];

/* ===========================
   会員ランクごとのテーマ定義
   =========================== */
const THEMES = {
    regular: {
        label:   'レギュラー会員',
        accent:  '#a8b4c4',
        bgTop:   '#141e2e',
        bgBot:   '#0a1018',
        leftBg:  '#0e1520',
        stripBg: '#08101a',
        badgeBg: 'rgba(168, 180, 196, 0.15)',
        vip:     false,
    },
    cast: {
        label:   'キャスト',
        accent:  '#d4af37',
        bgTop:   '#2e1e08',
        bgBot:   '#1a0e03',
        leftBg:  '#241604',
        stripBg: '#140d02',
        badgeBg: 'rgba(212, 175, 55, 0.15)',
        vip:     false,
    },
    vip: {
        label:   'VIP',
        // 黒×金基調。描画時にメタリックゴールドグラデーションを使用
        accent:  '#d4af37',
        bgTop:   '#0e0b04',
        bgBot:   '#000000',
        leftBg:  '#0a0800',
        stripBg: '#060500',
        badgeBg: 'rgba(212, 175, 55, 0.1)',
        vip:     true,
    },
};

/* ===========================
   初期化
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
    generateMemberId();
    // 背景セレクターのサムネイルを動的生成
    buildBgSelector();
    // カードロゴを事前ロード
    cardLogoImage = new Image();
    cardLogoImage.src = 'images/card-logo.png';
    cardLogoImage.onload = () => drawPreviewCard();
    // フォントの読み込みを待ってから初回描画
    document.fonts.ready.then(() => drawPreviewCard());
    setupEventListeners();
    // localStorageのVIPフラグを確認して解放済みなら自動アンロック
    checkVipUnlock();
});

/* ===========================
   VIP解放チェック（localStorageベース）
   メインサイトでVIPスロット発見後 + 29回クリックでフラグが立つ
   =========================== */
function checkVipUnlock() {
    if (localStorage.getItem('mesukemo_vip_unlocked') !== '1') return;
    if (document.getElementById('vipOption')) return;

    // VIPオプションをドロップダウンに追加
    const select = document.getElementById('cardType');
    const opt    = document.createElement('option');
    opt.value       = 'vip';
    opt.id          = 'vipOption';
    opt.textContent = '★ VIP';
    select.appendChild(opt);

    // VIP解放バナーを表示して自動選択
    const banner = document.getElementById('vipUnlockBanner');
    if (banner) banner.hidden = false;
    select.value = 'vip';
    drawPreviewCard();
}

/* ===========================
   イベントリスナーのセットアップ
   =========================== */
function setupEventListeners() {
    // 画像アップロード
    const photoUpload = document.getElementById('photoUpload');
    if (photoUpload) photoUpload.addEventListener('change', handlePhotoUpload);

    // ファイルアップロードエリアのドラッグ&ドロップ
    const fileUploadArea = document.getElementById('fileUploadArea');
    if (fileUploadArea) {
        fileUploadArea.addEventListener('dragover', e => {
            e.preventDefault();
            fileUploadArea.classList.add('drag-over');
        });
        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('drag-over');
        });
        fileUploadArea.addEventListener('drop', e => {
            e.preventDefault();
            fileUploadArea.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handlePhotoUploadFromFile(file);
            }
        });
    }

    // スケールスライダー
    const scaleSlider = document.getElementById('scaleSlider');
    if (scaleSlider) scaleSlider.addEventListener('input', handleScaleChange);

    // 写真プレビューcanvasのドラッグ
    const photoCanvas = document.getElementById('photoCanvas');
    if (photoCanvas) setupDragEvents(photoCanvas);

    // フォーム入力のリアルタイム反映
    ['userName', 'userTitle', 'favoriteSpecies', 'userComment', 'cardType'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input',  drawPreviewCard);
            el.addEventListener('change', drawPreviewCard);
        }
    });

    // 称号ランダム生成ボタン
    const regenTitleBtn = document.getElementById('regenTitleBtn');
    if (regenTitleBtn) regenTitleBtn.addEventListener('click', generateRandomTitle);

    // ボタン類（onclickから移行）
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) generateBtn.addEventListener('click', generateCard);

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', downloadCard);

    const resetFormBtn = document.getElementById('resetFormBtn');
    if (resetFormBtn) resetFormBtn.addEventListener('click', resetForm);

    const resetPhotoBtn = document.getElementById('resetPhotoBtn');
    if (resetPhotoBtn) resetPhotoBtn.addEventListener('click', resetPhotoPosition);

    const regenMemberIdBtn = document.getElementById('regenMemberIdBtn');
    if (regenMemberIdBtn) regenMemberIdBtn.addEventListener('click', generateMemberId);

    const backBtn = document.getElementById('backBtn');
    if (backBtn) backBtn.addEventListener('click', goBack);
}

/* ===========================
   会員番号を日時ベースで生成（年2桁+月+日+時+分）
   =========================== */
function generateMemberId() {
    const now  = new Date();
    const yy   = now.getFullYear().toString().slice(2);
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const dd   = String(now.getDate()).padStart(2, '0');
    const hh   = String(now.getHours()).padStart(2, '0');
    const min  = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('memberId').value = `${yy}${mm}${dd}${hh}${min}`;
}

/* ===========================
   称号ランダム生成（「〇〇の✕✕」形式）
   前半・後半をそれぞれランダムに組み合わせて称号を生成する
   =========================== */
const TITLE_PREFIX = [
    'ふわふわ', 'もふもふ', 'なでなで', 'きゅんきゅん', 'どきどき',
    'ぽかぽか', 'ほんわか', 'すやすや', 'ぬくぬく', 'にこにこ',
    'うとうと', 'とろとろ', 'うきうき', 'わくわく', 'ほわほわ',
    '永遠', '蒼き天', '黄昏', '夢見る', '甘えん坊',
    'もこもこ', 'ふかふか', 'むにむに', 'もちもち', 'ぺたぺた',
    'てろてろ', 'ごろごろ', 'ふにゃふにゃ', 'ぎゅっと', 'ぺろぺろ',
];
const TITLE_SUFFIX = [
    '愛好家', '守護者', '推進者', '番人', '熱狂者',
    '騎士', '研究者', '案内人', 'メンバー', 'サポーター',
    '同好者', '愛護者', '観察者', '先駆者', '探求者',
    '語り部', '応援団長', 'なでなで師', 'もふもふ師', '常連さん',
    '見守り隊', '推し活民', '溺愛者', '仲間', 'ほっこり担当',
    'ファン代表', 'お世話係', '癒し担当', 'なかよし', 'お迎え係',
];

function generateRandomTitle() {
    const prefix = TITLE_PREFIX[Math.floor(Math.random() * TITLE_PREFIX.length)];
    const suffix = TITLE_SUFFIX[Math.floor(Math.random() * TITLE_SUFFIX.length)];
    const titleInput = document.getElementById('userTitle');
    if (titleInput) {
        titleInput.value = `${prefix}の${suffix}`;
        drawPreviewCard();
    }
}

/* ===========================
   背景セレクターのサムネイルをBG_OPTIONSから動的生成する
   画像を追加するにはBG_OPTIONSにエントリを追加するだけでよい
   =========================== */
function buildBgSelector() {
    const container = document.getElementById('bgSelector');
    if (!container) return;

    BG_OPTIONS.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'bg-option' + (opt.id === 'none' ? ' selected' : '');
        item.dataset.bgId = opt.id;
        item.title = opt.label;

        if (opt.src) {
            // 画像サムネイル
            const img = document.createElement('img');
            img.src = opt.src;
            img.alt = opt.label;
            img.className = 'bg-option-img';
            item.appendChild(img);
        } else if (opt.color) {
            // 単色カラースウォッチ
            const swatch = document.createElement('div');
            swatch.className = 'bg-option-color';
            swatch.style.background = opt.color;
            // 白・明るい色は枠で視認しやすくする
            const isLight = isLightColor(opt.color);
            if (isLight) swatch.style.border = '1px solid rgba(0,0,0,0.2)';
            item.appendChild(swatch);
        } else {
            // グラデーションプレビュー
            const grad = document.createElement('div');
            grad.className = 'bg-option-gradient';
            item.appendChild(grad);
        }

        // ラベル
        const label = document.createElement('span');
        label.className = 'bg-option-label';
        label.textContent = opt.label;
        item.appendChild(label);

        item.addEventListener('click', () => selectBg(opt));
        container.appendChild(item);
    });
}

/* ===========================
   背景オプションの選択処理
   画像がある場合は事前ロードしてからカードを再描画する
   =========================== */
function selectBg(opt) {
    selectedBgId = opt.id;

    // 選択状態を更新
    document.querySelectorAll('.bg-option').forEach(el => {
        el.classList.toggle('selected', el.dataset.bgId === opt.id);
    });

    if (opt.src) {
        // 画像背景：ロードしてから描画
        const img = new Image();
        img.onload = () => {
            bgImage = img;
            bgColor = null;
            drawPreviewCard();
        };
        img.onerror = () => {
            // 画像が存在しない場合はグラデーションにフォールバック
            bgImage = null;
            bgColor = null;
            drawPreviewCard();
        };
        img.src = opt.src;
    } else if (opt.color) {
        // 単色カラー背景
        bgImage = null;
        bgColor = opt.color;
        drawPreviewCard();
    } else {
        // グラデーション（デフォルト）
        bgImage = null;
        bgColor = null;
        drawPreviewCard();
    }
}

/* ===========================
   画像アップロード処理（inputのchangeイベント用）
   =========================== */
async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    // ファイルアップロードエリアのラベルを更新
    const area = document.getElementById('fileUploadArea');
    if (area) {
        area.querySelector('.file-upload-text').textContent = file.name;
        area.classList.add('has-file');
    }
    await handlePhotoUploadFromFile(file);
}

/* ===========================
   ファイルオブジェクトから写真を読み込む共通処理
   （input change / ドラッグ&ドロップ 両方から呼ばれる）
   =========================== */
async function handlePhotoUploadFromFile(file) {
    try {
        photoImage = await loadAndResizeImage(file);
        photoX = 0;
        photoY = 0;
        photoScale = 1.0;

        const scaleSlider = document.getElementById('scaleSlider');
        if (scaleSlider) {
            scaleSlider.value = 100;
            document.getElementById('scaleValue').textContent = '100%';
        }

        document.getElementById('photoPreviewContainer').style.display = 'block';
        drawPhotoPreview();
        drawPreviewCard();
    } catch (err) {
        alert('画像の読み込みに失敗しました: ' + err.message);
    }
}

/* ===========================
   画像を1920px以内にリサイズして返す
   =========================== */
function loadAndResizeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const MAX = 1920;
                let { width: w, height: h } = img;
                if (w > MAX || h > MAX) {
                    const s = Math.min(MAX / w, MAX / h);
                    w = Math.floor(w * s);
                    h = Math.floor(h * s);
                    const offscreen = document.createElement('canvas');
                    offscreen.width  = w;
                    offscreen.height = h;
                    offscreen.getContext('2d').drawImage(img, 0, 0, w, h);
                    const resized = new Image();
                    resized.onload = () => resolve(resized);
                    resized.onerror = reject;
                    resized.src = offscreen.toDataURL('image/jpeg', 0.92);
                } else {
                    resolve(img);
                }
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* ===========================
   共通写真描画関数
   ★ この関数をプレビューとカードの両方で使うことで表示を完全一致させる
   - ctx      : 描画対象のCanvasコンテキスト
   - originX  : カード上での写真エリア左上X（プレビューでは0）
   - originY  : カード上での写真エリア左上Y（プレビューでは0）
   - bgColor  : 写真なし時の背景色
   =========================== */
function drawPhotoClipped(ctx, originX, originY, bgColor) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(originX, originY, PHOTO_W, PHOTO_H);
    ctx.clip();

    // 背景
    ctx.fillStyle = bgColor || '#1a1a2e';
    ctx.fillRect(originX, originY, PHOTO_W, PHOTO_H);

    if (photoImage) {
        const w = photoImage.width  * photoScale;
        const h = photoImage.height * photoScale;
        // originX/Y を加算することでプレビューとカードで同じ見た目になる
        ctx.drawImage(photoImage, originX + photoX, originY + photoY, w, h);
        // 写真にビネット（周辺減光）をかけて深みを出す
        const vignette = ctx.createRadialGradient(
            originX + PHOTO_W / 2, originY + PHOTO_H * 0.45, PHOTO_W * 0.3,
            originX + PHOTO_W / 2, originY + PHOTO_H * 0.5,  PHOTO_W * 0.85
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
        ctx.fillStyle = vignette;
        ctx.fillRect(originX, originY, PHOTO_W, PHOTO_H);
    } else {
        // 写真未選択時のプレースホルダー
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.font = `${Math.round(PHOTO_H * 0.08)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('写真をアップロード', originX + PHOTO_W / 2, originY + PHOTO_H / 2);
    }

    ctx.restore();
}

/* ===========================
   写真調整プレビュー描画（PHOTO_W × PHOTO_H のcanvas）
   カードと同じ drawPhotoClipped を origin=(0,0) で呼ぶだけ
   =========================== */
function drawPhotoPreview() {
    const canvas = document.getElementById('photoCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = PHOTO_W;
    canvas.height = PHOTO_H;
    ctx.clearRect(0, 0, PHOTO_W, PHOTO_H);
    drawPhotoClipped(ctx, 0, 0, '#1a1a2e');
}

/* ===========================
   スケールスライダー変更
   =========================== */
function handleScaleChange(e) {
    photoScale = e.target.value / 100;
    document.getElementById('scaleValue').textContent = e.target.value + '%';
    drawPhotoPreview();
    drawPreviewCard();
}

/* ===========================
   ドラッグ＆ドロップ（マウス＆タッチ対応）
   =========================== */
function setupDragEvents(canvas) {
    canvas.addEventListener('mousedown', e => {
        if (!photoImage) return;
        isDragging = true;
        dragStartX = e.offsetX - photoX;
        dragStartY = e.offsetY - photoY;
    });
    canvas.addEventListener('mousemove', e => {
        if (!isDragging) return;
        photoX = e.offsetX - dragStartX;
        photoY = e.offsetY - dragStartY;
        drawPhotoPreview();
        drawPreviewCard();
    });
    canvas.addEventListener('mouseup',    () => { isDragging = false; });
    canvas.addEventListener('mouseleave', () => { isDragging = false; });

    canvas.addEventListener('touchstart', e => {
        if (!photoImage) return;
        e.preventDefault();
        isDragging = true;
        const rect  = canvas.getBoundingClientRect();
        const t     = e.touches[0];
        const scaleX = PHOTO_W / rect.width;
        const scaleY = PHOTO_H / rect.height;
        dragStartX = (t.clientX - rect.left) * scaleX - photoX;
        dragStartY = (t.clientY - rect.top)  * scaleY - photoY;
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if (!isDragging) return;
        e.preventDefault();
        const rect  = canvas.getBoundingClientRect();
        const t     = e.touches[0];
        const scaleX = PHOTO_W / rect.width;
        const scaleY = PHOTO_H / rect.height;
        photoX = (t.clientX - rect.left) * scaleX - dragStartX;
        photoY = (t.clientY - rect.top)  * scaleY - dragStartY;
        drawPhotoPreview();
        drawPreviewCard();
    }, { passive: false });

    canvas.addEventListener('touchend',    e => { e.preventDefault(); isDragging = false; }, { passive: false });
    canvas.addEventListener('touchcancel', e => { e.preventDefault(); isDragging = false; }, { passive: false });
}

/* ===========================
   写真位置・スケールのリセット
   =========================== */
function resetPhotoPosition() {
    photoX = 0;
    photoY = 0;
    photoScale = 1.0;
    document.getElementById('scaleSlider').value = 100;
    document.getElementById('scaleValue').textContent = '100%';
    drawPhotoPreview();
    drawPreviewCard();
}

/* ===========================
   カードプレビュー描画（1024×650px）
   =========================== */
function drawPreviewCard() {
    const canvas = document.getElementById('cardCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = CARD_W;
    canvas.height = CARD_H;

    const cardType = document.getElementById('cardType').value;
    const theme    = THEMES[cardType] || THEMES.regular;

    // --- 背景（画像 / 単色カラー / グラデーション） ---
    if (bgImage) {
        // カードのアスペクト比に合わせて中央クロップして描画
        const imgRatio  = bgImage.width / bgImage.height;
        const cardRatio = CARD_W / CARD_H;
        let sx, sy, sw, sh;
        if (imgRatio > cardRatio) {
            sh = bgImage.height;
            sw = sh * cardRatio;
            sx = (bgImage.width - sw) / 2;
            sy = 0;
        } else {
            sw = bgImage.width;
            sh = sw / cardRatio;
            sx = 0;
            sy = (bgImage.height - sh) / 2;
        }
        ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, CARD_W, CARD_H);
        // テキスト可読性確保のためダークオーバーレイを重ねる
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, CARD_W, CARD_H);
    } else if (bgColor) {
        // 単色カラー背景
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, CARD_W, CARD_H);
        // 明るい色は少し落ち着かせる（文字は黒で対応済みなので軽めに）
        if (isLightColor(bgColor)) {
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            ctx.fillRect(0, 0, CARD_W, CARD_H);
        }
    } else {
        // グラデーション背景（デフォルト）
        const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
        bg.addColorStop(0, theme.bgTop);
        bg.addColorStop(1, theme.bgBot);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, CARD_W, CARD_H);
    }

    // --- 斜線テクスチャ（微妙な装飾） ---
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let i = -CARD_H; i < CARD_W + CARD_H; i += 28) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + CARD_H, CARD_H);
        ctx.stroke();
    }
    ctx.restore();

    // 明るい単色背景かどうかを判定（文字色・オーバーレイ色の切り替えに使用）
    const isLightBg = bgColor ? isLightColor(bgColor) : false;

    // --- 左パネル背景（画像・単色時は半透明オーバーレイ、グラデーション時はテーマ色） ---
    if (bgImage) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
    } else if (bgColor) {
        ctx.fillStyle = isLightBg ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
    } else {
        ctx.fillStyle = theme.leftBg;
    }
    ctx.fillRect(0, 0, LEFT_W, CARD_H);

    // --- 左パネル右側の縦線（アクセント） ---
    {
        const lineGrad = theme.vip
            ? makeGoldGrad(ctx, LEFT_W, 0, LEFT_W, CARD_H)
            : (() => {
                const g = ctx.createLinearGradient(LEFT_W, 0, LEFT_W, CARD_H);
                g.addColorStop(0,   'transparent');
                g.addColorStop(0.2, theme.accent);
                g.addColorStop(0.8, theme.accent);
                g.addColorStop(1,   'transparent');
                return g;
            })();
        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = theme.vip ? 2 : 1.5;
        ctx.beginPath();
        ctx.moveTo(LEFT_W, 0);
        ctx.lineTo(LEFT_W, CARD_H);
        ctx.stroke();
    }

    // --- 右パネルに微細ドットテクスチャ（高級感） ---
    {
        ctx.save();
        ctx.globalAlpha = 0.028;
        for (let dx = LEFT_W + 28; dx < CARD_W - 15; dx += 22) {
            for (let dy = 18; dy < STRIP_Y - 10; dy += 22) {
                ctx.beginPath();
                ctx.arc(dx, dy, 1.3, 0, Math.PI * 2);
                ctx.fillStyle = theme.accent;
                ctx.fill();
            }
        }
        ctx.restore();
    }

    // --- 写真描画（共通関数を使用）---
    drawPhotoClipped(ctx, PHOTO_X, PHOTO_Y, theme.leftBg);

    // --- 写真コーナーブラケット装飾 ---
    // VIPはゴールドグラデーション、それ以外はアクセントカラー単色
    drawPhotoCorners(ctx, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H,
        theme.vip ? makeGoldGrad(ctx, PHOTO_X, PHOTO_Y, PHOTO_X + PHOTO_W, PHOTO_Y + PHOTO_H) : theme.accent);

    // --- ボトムストリップ（画像・単色時は半透明オーバーレイ、グラデーション時はテーマ色） ---
    if (bgImage) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
    } else if (bgColor) {
        ctx.fillStyle = isLightBg ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
    } else {
        ctx.fillStyle = theme.stripBg;
    }
    ctx.fillRect(0, STRIP_Y, CARD_W, STRIP_H);

    // ストリップ上端線
    {
        const stripLine = theme.vip
            ? makeGoldGrad(ctx, 0, STRIP_Y, CARD_W, STRIP_Y)
            : (() => {
                const g = ctx.createLinearGradient(0, STRIP_Y, CARD_W, STRIP_Y);
                g.addColorStop(0,   'transparent');
                g.addColorStop(0.1, theme.accent);
                g.addColorStop(0.9, theme.accent);
                g.addColorStop(1,   'transparent');
                return g;
            })();
        ctx.strokeStyle = stripLine;
        ctx.lineWidth = theme.vip ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(0, STRIP_Y);
        ctx.lineTo(CARD_W, STRIP_Y);
        ctx.stroke();
    }

    // --- 右パネル：情報エリア ---
    drawCardInfo(ctx, theme, cardType, isLightBg);

    // --- ボトムストリップ：QR + モットー ---
    drawCardFooter(ctx, theme);

    // --- カード内枠線（プレミアム感） ---
    drawCardFrame(ctx, theme);
}

/* ===========================
   写真コーナーブラケット描画
   =========================== */
function drawPhotoCorners(ctx, x, y, w, h, color) {
    const size = 18;   // ブラケットの長さ
    const gap  = 4;    // 写真エリアの外側オフセット

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'square';

    const corners = [
        // [x起点, y起点, dx1, dy1, dx2, dy2]（L字の2辺）
        [x - gap,     y - gap,     size, 0,    0, size],   // 左上
        [x + w + gap, y - gap,    -size, 0,    0, size],   // 右上
        [x - gap,     y + h + gap, size, 0,    0, -size],  // 左下
        [x + w + gap, y + h + gap, -size, 0,   0, -size],  // 右下
    ];

    corners.forEach(([cx, cy, dx1, dy1, dx2, dy2]) => {
        ctx.beginPath();
        ctx.moveTo(cx + dx1, cy + dy1);
        ctx.lineTo(cx,        cy);
        ctx.lineTo(cx + dx2, cy + dy2);
        ctx.stroke();
    });

    ctx.restore();
}

/* ===========================
   右パネル情報エリア描画
   =========================== */
function drawCardInfo(ctx, theme, cardType, isLightBg = false) {
    const x         = INFO_X;
    const accent    = theme.accent;
    // 明るい背景のときは黒文字、通常は白系
    const textColor = isLightBg ? '#1a1a1a' : '#f0ece0';

    const userName        = document.getElementById('userName').value        || '———';
    const userTitle       = document.getElementById('userTitle').value       || '———';
    const favoriteSpecies = document.getElementById('favoriteSpecies').value || '———';
    const userComment     = document.getElementById('userComment').value     || '———';
    const memberId        = document.getElementById('memberId').value        || '——————————';
    const today         = new Date();
    const dateStr       = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`;

    // MEMBER CARD サブタイトル（小さく・薄く）
    ctx.save();
    ctx.fillStyle = isLightBg ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.2)';
    ctx.font = `400 11px 'Zen Maru Gothic', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('M E M B E R   C A R D', x, 44);
    ctx.restore();

    // 組織名
    ctx.save();
    if (theme.vip) {
        ctx.fillStyle = makeGoldGrad(ctx, x, 0, x + INFO_W, 0);
        ctx.shadowColor = 'rgba(212, 175, 55, 0.35)';
        ctx.shadowBlur  = 10;
    } else {
        ctx.fillStyle = accent;
    }
    ctx.font = `700 38px 'Noto Serif JP', serif`;
    ctx.textAlign = 'left';
    ctx.fillText('メスケモ推進委員会', x, 82);
    ctx.restore();

    // 会員ランクバッジ（組織名の右端に）
    drawBadge(ctx, theme.label, CARD_W - 28, 60, theme.accent, theme.badgeBg, theme.vip);

    // 組織名下セパレーター
    drawSeparator(ctx, x, 100, INFO_W, accent, 0.55, theme.vip);

    // 会員名（大きく・VIPはゴールドシャドウ）
    ctx.save();
    ctx.fillStyle = textColor;
    ctx.font = `700 42px 'Noto Serif JP', serif`;
    ctx.textAlign = 'left';
    if (theme.vip) {
        ctx.shadowColor = 'rgba(212, 175, 55, 0.3)';
        ctx.shadowBlur  = 14;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 112, INFO_W, 64);
    ctx.clip();
    ctx.fillText(userName, x, 158);
    ctx.restore();
    ctx.restore();

    // 会員名下セパレーター
    drawSeparator(ctx, x, 178, INFO_W, accent, 0.28, theme.vip);

    // 情報テーブル（5行・55px間隔でSTRIP_Yに収まるよう調整）
    const rows = [
        { label: '会員番号',   value: memberId },
        { label: '称号',       value: userTitle },
        { label: '好きな種族', value: favoriteSpecies || '———' },
        { label: 'コメント',   value: userComment },
        { label: '発行日',     value: dateStr },
    ];

    rows.forEach((row, i) => {
        const ry = 215 + i * 55;
        drawInfoRow(ctx, x, ry, row.label, row.value, accent, textColor, theme.vip);
    });

    // ボトム装飾テキスト（余白を埋めるタグライン）
    const tagY = STRIP_Y - 22;
    ctx.save();

    // 左右フェードのグラデーションライン
    {
        const g = ctx.createLinearGradient(x, tagY - 10, x + INFO_W, tagY - 10);
        g.addColorStop(0,   'transparent');
        g.addColorStop(0.1, theme.vip ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.09)');
        g.addColorStop(0.9, theme.vip ? 'rgba(212,175,55,0.25)' : 'rgba(255,255,255,0.09)');
        g.addColorStop(1,   'transparent');
        ctx.strokeStyle = g;
        ctx.lineWidth   = 0.75;
        ctx.beginPath();
        ctx.moveTo(x, tagY - 10);
        ctx.lineTo(x + INFO_W, tagY - 10);
        ctx.stroke();
    }

    // タグライン文字列
    ctx.font      = `400 11px 'Zen Maru Gothic', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.vip
        ? 'rgba(212,175,55,0.55)'
        : 'rgba(255,255,255,0.22)';
    ctx.fillText('MESUKEMO SUISHIN IINKAI', x + INFO_W / 2, tagY);
    ctx.restore();
}

/* ===========================
   情報行1行描画（ラベル + 値）
   =========================== */
/* isVip=true の場合はゴールドテーマのピルバッジを描画する */
function drawInfoRow(ctx, x, y, label, value, accent, textColor, isVip) {
    ctx.save();

    // ピル形ラベルバッジ
    ctx.font = `500 13px 'Zen Maru Gothic', sans-serif`;
    const lw   = ctx.measureText(label).width;
    const padX = 11;
    const bw   = lw + padX * 2;
    const bh   = 21;
    const bx   = x;
    const by   = y - bh + 5;
    const br   = bh / 2; // 完全な角丸（pill形状）

    // バッジ背景
    ctx.fillStyle = isVip ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.055)';
    roundRect(ctx, bx, by, bw, bh, br);
    ctx.fill();

    // バッジ枠線
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = isVip ? makeGoldGrad(ctx, bx, by, bx + bw, by) : accent;
    ctx.lineWidth   = 0.75;
    roundRect(ctx, bx, by, bw, bh, br);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ラベルテキスト
    ctx.fillStyle = accent;
    ctx.font = `500 13px 'Zen Maru Gothic', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(label, bx + padX, y);

    // 値テキスト
    ctx.fillStyle = textColor;
    ctx.font = `400 21px 'Zen Maru Gothic', sans-serif`;
    const valueX = x + bw + 14;
    ctx.save();
    ctx.beginPath();
    ctx.rect(valueX, y - 24, INFO_W - bw - 14, 32);
    ctx.clip();
    ctx.fillText(value, valueX, y);
    ctx.restore();

    // ドット区切り線
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(x, y + 17);
    ctx.lineTo(x + INFO_W, y + 17);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
}

/* ===========================
   区切り線描画（両端がフェードするグラデーション）
   isVip=true の場合は虹グラデーションを使用
   =========================== */
function drawSeparator(ctx, x, y, width, color, opacity = 0.6, isVip = false) {
    ctx.save();
    ctx.globalAlpha = opacity;
    if (isVip) {
        ctx.strokeStyle = makeGoldGrad(ctx, x, y, x + width, y);
    } else {
        const grad = ctx.createLinearGradient(x, y, x + width, y);
        grad.addColorStop(0,   color);
        grad.addColorStop(0.8, color);
        grad.addColorStop(1,   'transparent');
        ctx.strokeStyle = grad;
    }
    ctx.lineWidth   = isVip ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.stroke();
    ctx.restore();
}

/* ===========================
   カード種類バッジ描画（右端基準で配置）
   isVip=true の場合は虹グラデーションを使用
   =========================== */
/* pill形バッジ（会員ランク表示） */
function drawBadge(ctx, text, rightX, centerY, accent, bgColor, isVip = false) {
    ctx.save();
    ctx.font = `600 14px 'Zen Maru Gothic', sans-serif`;
    const textW = ctx.measureText(text).width;
    const padX  = 16;
    const bw    = textW + padX * 2;
    const bh    = 28;
    const bx    = rightX - bw;
    const by    = centerY - bh / 2;
    const br    = bh / 2; // pill形状

    // バッジ背景
    ctx.fillStyle = bgColor;
    roundRect(ctx, bx, by, bw, bh, br);
    ctx.fill();

    // バッジ枠線
    ctx.globalAlpha = isVip ? 0.75 : 0.6;
    ctx.strokeStyle = isVip
        ? makeGoldGrad(ctx, bx, by, bx + bw, by)
        : accent;
    ctx.lineWidth = isVip ? 1.5 : 1;
    roundRect(ctx, bx, by, bw, bh, br);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // バッジテキスト
    ctx.fillStyle  = isVip ? makeGoldGrad(ctx, bx, by, bx + bw, by) : accent;
    ctx.textAlign  = 'right';
    ctx.fillText(text, rightX - padX, centerY + 5);
    ctx.restore();
}

/* ===========================
   カード内枠線（プレミアム感を出す細いインセットボーダー）
   =========================== */
function drawCardFrame(ctx, theme) {
    const inset = 7;
    ctx.save();
    const g = theme.vip
        ? (() => {
            const grad = ctx.createLinearGradient(inset, inset, CARD_W - inset, CARD_H - inset);
            grad.addColorStop(0,   '#7a5a10');
            grad.addColorStop(0.5, '#d4af37');
            grad.addColorStop(1,   '#7a5a10');
            return grad;
          })()
        : (() => {
            const grad = ctx.createLinearGradient(inset, inset, CARD_W - inset, CARD_H - inset);
            grad.addColorStop(0,   theme.accent);
            grad.addColorStop(0.7, theme.accent);
            grad.addColorStop(1,   'transparent');
            return grad;
          })();
    ctx.strokeStyle  = g;
    ctx.lineWidth    = 1;
    ctx.globalAlpha  = theme.vip ? 0.48 : 0.18;
    ctx.strokeRect(inset, inset, CARD_W - inset * 2, CARD_H - inset * 2);
    ctx.restore();
}

/* ===========================
   メタリックゴールドグラデーション生成ヘルパー（VIP専用）
   水平方向に光沢感のある金属的なゴールドを生成する
   =========================== */
function makeGoldGrad(ctx, x1, y1, x2, y2) {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    g.addColorStop(0,    '#7a5a10');
    g.addColorStop(0.25, '#d4af37');
    g.addColorStop(0.5,  '#f5e070');
    g.addColorStop(0.75, '#d4af37');
    g.addColorStop(1,    '#7a5a10');
    return g;
}

/* ===========================
   ボトムストリップ（QR + モットー）描画
   =========================== */
function drawCardFooter(ctx, theme) {
    const cy = STRIP_Y + STRIP_H / 2;  // ストリップ垂直中央

    // --- ロゴ（左側） ---
    const logoSize = 76;
    const logoX    = PHOTO_X - 2;
    const logoY    = cy - logoSize / 2;

    ctx.save();
    if (cardLogoImage && cardLogoImage.complete) {
        // ロゴをlogoSizeの正方形に収めてアスペクト比を維持
        const lw = cardLogoImage.naturalWidth  || cardLogoImage.width;
        const lh = cardLogoImage.naturalHeight || cardLogoImage.height;
        const ls = Math.min(logoSize / lw, logoSize / lh);
        const dw = lw * ls;
        const dh = lh * ls;
        const dx = logoX + (logoSize - dw) / 2;
        const dy = logoY + (logoSize - dh) / 2;
        // VIPはゴールドtint（composite multiply → globalAlpha + カラー重ね）
        ctx.globalAlpha = theme.vip ? 0.88 : 0.72;
        ctx.drawImage(cardLogoImage, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
    }
    ctx.restore();

    // --- モットーテキスト（中央） ---
    ctx.save();
    if (theme.vip) {
        ctx.fillStyle   = makeGoldGrad(ctx, CARD_W * 0.3, cy, CARD_W * 0.7, cy);
        ctx.globalAlpha = 0.88;
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.42)';
    }
    ctx.font      = `400 18px 'Noto Serif JP', serif`;
    ctx.textAlign = 'center';
    ctx.fillText('真正なるメスケモ推進委員会会員', CARD_W / 2, cy + 7);
    ctx.restore();

    // --- 右装飾（ひし形ドット） ---
    ctx.save();
    ctx.fillStyle   = theme.vip
        ? makeGoldGrad(ctx, CARD_W - 140, cy, CARD_W - 28, cy)
        : theme.accent;
    ctx.globalAlpha = 0.42;
    for (let i = 0; i < 4; i++) {
        const dx = CARD_W - 110 + i * 22;
        ctx.save();
        ctx.translate(dx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
    }
    ctx.restore();
}

/* ===========================
   角丸矩形パスのユーティリティ
   =========================== */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/* ===========================
   カード生成（バリデーション + ダウンロードボタン表示）
   =========================== */
function generateCard() {
    const userName = document.getElementById('userName').value.trim();
    if (!userName) {
        alert('お名前を入力してください');
        return;
    }
    drawPreviewCard();
    document.getElementById('downloadSection').style.display = 'block';
    updateShareXBtn();
    alert('カードが生成されました！\nダウンロードボタンから保存できます。');
}

/* ===========================
   Xシェアボタンのhrefを動的生成して表示する
   称号（userTitle）を含めたツイートテキストを構築する
   =========================== */
function updateShareXBtn() {
    const shareBtn = document.getElementById('shareXBtn');
    if (!shareBtn) return;

    const userTitle = document.getElementById('userTitle').value.trim();

    const tweetText = userTitle
        ? `メスケモ推進委員会の会員カードを作りました！\n「${userTitle}」として認定されました🐾`
        : 'メスケモ推進委員会の会員カードを作りました！🐾';

    const params = new URLSearchParams({
        text: tweetText,
        url: 'https://mesukemo.uk/',
        hashtags: 'メスケモ推進委員会,VRChat',
    });

    shareBtn.href = `https://twitter.com/intent/tweet?${params.toString()}`;
    shareBtn.style.display = 'inline-flex';

    const shareHint = document.getElementById('shareXHint');
    if (shareHint) shareHint.style.display = 'block';
}

/* ===========================
   カードダウンロード
   =========================== */
function downloadCard() {
    const canvas   = document.getElementById('cardCanvas');
    const userName = document.getElementById('userName').value.trim() || 'member';
    const link     = document.createElement('a');
    link.download  = `mesukemo-card-${userName}.png`;
    link.href      = canvas.toDataURL('image/png');
    link.click();
}

/* ===========================
   フォームリセット
   =========================== */
function resetForm() {
    document.getElementById('userName').value        = '';
    document.getElementById('photoUpload').value     = '';
    document.getElementById('userTitle').value       = '';
    document.getElementById('favoriteSpecies').value = '';
    document.getElementById('userComment').value     = '';
    document.getElementById('cardType').selectedIndex = 0;
    document.getElementById('photoPreviewContainer').style.display = 'none';
    document.getElementById('downloadSection').style.display       = 'none';

    // 背景を「グラデーション」に戻す（bgColor もリセット）
    bgColor = null;
    selectBg(BG_OPTIONS[0]);

    photoImage = null;
    photoX = 0;
    photoY = 0;
    photoScale = 1.0;

    generateMemberId();

    // Xシェアボタンとヘルプテキストを非表示に戻す
    const shareBtn = document.getElementById('shareXBtn');
    if (shareBtn) shareBtn.style.display = 'none';
    const shareHint = document.getElementById('shareXHint');
    if (shareHint) shareHint.style.display = 'none';

    drawPreviewCard();
}

/* ===========================
   メインページへ戻る
   =========================== */
function goBack() {
    if (confirm('メインページに戻りますか？')) {
        window.location.href = 'index.html';
    }
}

/* ===========================
   ユーティリティ
   =========================== */
/**
 * 16進カラーコードが明るい色かどうかを判定する（スウォッチ枠表示に使用）
 * @param {string} hex - '#ffffff' 形式のカラーコード
 * @returns {boolean} 明るければ true
 */
function isLightColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // 相対輝度（知覚輝度）が0.5以上なら明るいと判定
    return (r * 0.299 + g * 0.587 + b * 0.114) > 128;
}
