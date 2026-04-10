/* ===========================
   会員カードジェネレーター
   写真アップロード・位置調整・カード描画・ダウンロード
   =========================== */

'use strict';

// 写真の状態管理
let photoImage = null;
let photoScale = 1.0;
let photoX = 0;
let photoY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

/* ===========================
   初期化
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
    generateMemberId();
    drawPreviewCard();
    setupEventListeners();
});

/* ===========================
   イベントリスナーのセットアップ
   =========================== */
function setupEventListeners() {
    // 画像アップロード
    const photoUpload = document.getElementById('photoUpload');
    if (photoUpload) {
        photoUpload.addEventListener('change', handlePhotoUpload);
    }

    // スケールスライダー
    const scaleSlider = document.getElementById('scaleSlider');
    if (scaleSlider) {
        scaleSlider.addEventListener('input', handleScaleChange);
    }

    // ドラッグイベント（写真プレビューcanvas）
    const photoCanvas = document.getElementById('photoCanvas');
    if (photoCanvas) {
        setupDragEvents(photoCanvas);
    }

    // 入力フィールド変更でリアルタイムプレビュー更新
    ['userName', 'favoriteCast', 'favoriteSpecies', 'cardType'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', drawPreviewCard);
            element.addEventListener('change', drawPreviewCard);
        }
    });
}

/* ===========================
   会員番号を日時ベースで生成（10桁: 年2桁+月+日+時+分）
   例: 2604101909 = 2026年4月10日19:09
   =========================== */
function generateMemberId() {
    const now = new Date();
    const year  = now.getFullYear().toString().slice(2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day   = now.getDate().toString().padStart(2, '0');
    const hour  = now.getHours().toString().padStart(2, '0');
    const min   = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('memberId').value = `${year}${month}${day}${hour}${min}`;
}

/* ===========================
   画像アップロード処理
   =========================== */
async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        photoImage = await loadAndResizeImage(file);

        // 位置・スケールをリセット
        photoX = 0;
        photoY = 0;
        photoScale = 1.0;
        const scaleSlider = document.getElementById('scaleSlider');
        if (scaleSlider) {
            scaleSlider.value = 100;
            document.getElementById('scaleValue').textContent = '100%';
        }

        // プレビューコンテナを表示
        document.getElementById('photoPreviewContainer').style.display = 'block';

        drawPhotoPreview();
        drawPreviewCard();
    } catch (error) {
        alert('画像の読み込みに失敗しました: ' + error.message);
    }
}

/* ===========================
   画像を読み込んで1024px以内にリサイズ
   =========================== */
function loadAndResizeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            const img = new Image();

            img.onload = function() {
                const MAX_SIZE = 1024;
                let w = img.width;
                let h = img.height;

                if (w > MAX_SIZE || h > MAX_SIZE) {
                    const scale = Math.min(MAX_SIZE / w, MAX_SIZE / h);
                    w = Math.floor(w * scale);
                    h = Math.floor(h * scale);

                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);

                    const resizedImg = new Image();
                    resizedImg.onload = () => resolve(resizedImg);
                    resizedImg.onerror = reject;
                    resizedImg.src = canvas.toDataURL('image/jpeg', 0.9);
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
   写真プレビューの描画（300×380の調整用canvas）
   =========================== */
function drawPhotoPreview() {
    const canvas = document.getElementById('photoCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 300;
    canvas.height = 380;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (photoImage) {
        const imgW = photoImage.width  * photoScale;
        const imgH = photoImage.height * photoScale;
        ctx.drawImage(photoImage, photoX, photoY, imgW, imgH);
    }
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
    // マウスイベント
    canvas.addEventListener('mousedown', (e) => {
        if (!photoImage) return;
        isDragging = true;
        dragStartX = e.offsetX - photoX;
        dragStartY = e.offsetY - photoY;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        photoX = e.offsetX - dragStartX;
        photoY = e.offsetY - dragStartY;
        drawPhotoPreview();
        drawPreviewCard();
    });

    canvas.addEventListener('mouseup',    () => { isDragging = false; });
    canvas.addEventListener('mouseleave', () => { isDragging = false; });

    // タッチイベント（スマホ対応）
    canvas.addEventListener('touchstart', (e) => {
        if (!photoImage) return;
        e.preventDefault();
        isDragging = true;
        const rect  = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        dragStartX = (touch.clientX - rect.left) - photoX;
        dragStartY = (touch.clientY - rect.top)  - photoY;
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const rect  = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        photoX = (touch.clientX - rect.left) - dragStartX;
        photoY = (touch.clientY - rect.top)  - dragStartY;
        drawPhotoPreview();
        drawPreviewCard();
    }, { passive: false });

    canvas.addEventListener('touchend',    (e) => { e.preventDefault(); isDragging = false; }, { passive: false });
    canvas.addEventListener('touchcancel', (e) => { e.preventDefault(); isDragging = false; }, { passive: false });
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
    const ctx = canvas.getContext('2d');

    const cardW = 1024;
    const cardH = 650;
    canvas.width  = cardW;
    canvas.height = cardH;

    // カード種類によるカラー設定
    const cardType = document.getElementById('cardType').value;
    let accentColor   = '#d4af37'; // デフォルト: ゴールド
    let gradientStart = '#8b6f47';
    let gradientEnd   = '#6b5638';

    if (cardType === 'regular') {
        accentColor = '#c0c0c0';
    } else if (cardType === 'platinum') {
        accentColor   = '#e5e4e2';
        gradientStart = '#9a9a9a';
        gradientEnd   = '#7a7a7a';
    } else if (cardType === 'chairman') {
        accentColor   = '#ff6b6b';
        gradientStart = '#5c4033';
        gradientEnd   = '#3d2a21';
    }

    // 背景グラデーション
    const gradient = ctx.createLinearGradient(0, 0, cardW, cardH);
    gradient.addColorStop(0, gradientStart);
    gradient.addColorStop(1, gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, cardW, cardH);

    // 顔写真エリア（左側）
    const photoAreaX = 40;
    const photoAreaY = 40;
    const photoAreaW = 320;
    const photoAreaH = 420;

    ctx.fillStyle = 'rgba(245, 243, 237, 0.9)';
    ctx.fillRect(photoAreaX, photoAreaY, photoAreaW, photoAreaH);

    // 写真を描画（クリッピング適用）
    if (photoImage) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(photoAreaX, photoAreaY, photoAreaW, photoAreaH);
        ctx.clip();

        const scale  = photoScale * 0.8;
        const imgW   = photoImage.width  * scale;
        const imgH   = photoImage.height * scale;

        ctx.drawImage(
            photoImage,
            photoAreaX + photoX * 1.067,
            photoAreaY + photoY * 1.105,
            imgW,
            imgH
        );

        ctx.restore();
    }

    // 写真エリア枠線
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(photoAreaX, photoAreaY, photoAreaW, photoAreaH);

    // 右側：会員情報
    const infoX = 400;

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 48px "Noto Serif JP", serif';
    ctx.fillText('メスケモ推進委員会', infoX, 100);

    ctx.font = 'bold 32px "Noto Serif JP", serif';
    const cardTypeLabels = {
        regular:  'レギュラー会員',
        gold:     'ゴールド会員',
        platinum: 'プラチナ会員',
        chairman: '委員長カード',
    };
    ctx.fillText(cardTypeLabels[cardType] || 'レギュラー会員', infoX, 150);

    // 会員情報テキスト
    ctx.fillStyle = '#f5f3ed';
    ctx.font = '28px "Zen Maru Gothic", sans-serif';

    const userName      = document.getElementById('userName').value      || '未入力';
    const favoriteCast  = document.getElementById('favoriteCast').value  || '未選択';
    const favoriteSpecies = document.getElementById('favoriteSpecies').value || '未入力';
    const memberId      = document.getElementById('memberId').value;

    ctx.fillText(`会員名: ${userName}`,       infoX, 220);
    ctx.fillText(`会員番号: ${memberId}`,     infoX, 270);
    ctx.fillText(`推しキャスト: ${favoriteCast}`, infoX, 320);
    ctx.fillText(`好きな種族: ${favoriteSpecies}`, infoX, 370);

    // 発行日
    const today = new Date();
    const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    ctx.font = '20px "Zen Maru Gothic", sans-serif';
    ctx.fillText(`発行日: ${dateStr}`, infoX, 420);

    // 下部メッセージ（中央揃え）
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 24px "Noto Serif JP", serif';
    ctx.textAlign = 'center';
    ctx.fillText('真正なるメスケモ推進委員会会員', cardW / 2, 550);

    // QRコード風装飾（左下）
    ctx.fillStyle = '#f5f3ed';
    ctx.fillRect(40, 490, 100, 100);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 490, 100, 100);
    ctx.textAlign = 'left';
    ctx.font = '14px "Zen Maru Gothic", sans-serif';
    ctx.fillStyle = '#5c4033';
    ctx.fillText('QR', 75, 545);
}

/* ===========================
   カード生成（バリデーション＋ダウンロードボタン表示）
   =========================== */
function generateCard() {
    const userName = document.getElementById('userName');

    if (!userName || !userName.value.trim()) {
        alert('お名前を入力してください');
        return;
    }

    drawPreviewCard();
    document.getElementById('downloadSection').style.display = 'block';
    alert('カードが生成されました！\nダウンロードボタンから保存できます。');
}

/* ===========================
   カードダウンロード
   =========================== */
function downloadCard() {
    const canvas   = document.getElementById('cardCanvas');
    const userName = document.getElementById('userName').value || 'member';
    const link = document.createElement('a');
    link.download = `mesukemo-card-${userName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

/* ===========================
   フォームリセット
   =========================== */
function resetForm() {
    document.getElementById('userName').value = '';
    document.getElementById('photoUpload').value = '';
    document.getElementById('favoriteCast').selectedIndex = 0;
    document.getElementById('favoriteSpecies').value = '';
    document.getElementById('cardType').selectedIndex = 0;
    document.getElementById('photoPreviewContainer').style.display = 'none';
    document.getElementById('downloadSection').style.display = 'none';

    photoImage = null;
    photoX = 0;
    photoY = 0;
    photoScale = 1.0;

    generateMemberId();
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
