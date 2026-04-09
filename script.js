/**
 * なでなで茶屋 公式イベントサイト - メインスクリプト
 *
 * 機能:
 *   - タブ切り替え・背景画像切り替え
 *   - キャスト一覧の動的生成（木札グリッド）
 *   - リアルタイム検索（部分一致・大文字小文字区別なし）
 *   - キャスト詳細ビュー（木札を非表示にして詳細を表示）
 *   - キーボードアクセシビリティ（ESCキーで詳細を閉じる）
 */

'use strict';

/* ===========================
   キャストデータ定義
   実際のデータに差し替えてください
   =========================== */
const castData = [
    {
        id: 1,
        name: 'takaniso',
        image: 'images/cast/takaniso.png',
        description: 'ここに挨拶文や紹介を入れてください。',
    },
    // 以降は実際のキャストデータに差し替えてください
    ...Array.from({ length: 59 }, (_, i) => ({
        id: i + 2,
        name: `キャスト名${i + 2}`,
        image: `images/cast/cast${i + 2}.jpg`,
        description: `キャスト${i + 2}の紹介文です。`,
    })),
];

/* ===========================
   DOM要素の取得
   =========================== */
const tabButtons   = document.querySelectorAll('.tab-button');
const tabContents  = document.querySelectorAll('.tab-content');
const castGrid     = document.getElementById('castGrid');
const searchInput  = document.getElementById('castSearch');
const noResults    = document.getElementById('noResults');
const castCard     = document.getElementById('castCard');     // 木札グリッドのカード
const castDetail   = document.getElementById('castDetail');   // 詳細ビュー
const detailImage  = document.getElementById('detailImage');
const detailName   = document.getElementById('detailName');
const detailDesc   = document.getElementById('detailDescription');
const detailClose  = document.getElementById('detailClose');

/* ===========================
   画像が読み込めなかった場合のSVGプレースホルダー
   =========================== */

/** 木札カード用プレースホルダー（3:4縦長） */
const placeholderCard = [
    'data:image/svg+xml,',
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">' +
        '<rect fill="#e8dcc8" width="300" height="400"/>' +
        '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"' +
        ' font-family="sans-serif" font-size="18" fill="#8b6f47">画像未設定</text>' +
        '</svg>'
    ),
].join('');

/** 詳細ビュー用プレースホルダー */
const placeholderDetail = [
    'data:image/svg+xml,',
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">' +
        '<rect fill="#2d2d2d" width="600" height="800"/>' +
        '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"' +
        ' font-family="sans-serif" font-size="24" fill="#8b6f47">画像未設定</text>' +
        '</svg>'
    ),
].join('');

/* ===========================
   タブ切り替え
   =========================== */

/**
 * 指定したタブIDをアクティブにし、対応するコンテンツと背景画像を切り替える
 * タブ切り替え時は詳細ビューを閉じて木札グリッドに戻す
 * @param {string} targetId - 表示するタブのID（'about' | 'cast' | 'official'）
 */
function activateTab(targetId) {
    tabButtons.forEach((btn) => {
        const isActive = btn.dataset.tab === targetId;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
    });

    tabContents.forEach((section) => {
        section.classList.toggle('active', section.id === targetId);
    });

    // bodyのタブクラスを切り替えて背景画像を変更
    document.body.classList.remove('tab-about', 'tab-cast', 'tab-official');
    document.body.classList.add(`tab-${targetId}`);

    // キャスト以外のタブに切り替えた場合、詳細ビューが開いていたら閉じる
    if (targetId !== 'cast') {
        closeCastDetail();
    }
}

tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

/* ===========================
   キャスト一覧の生成（木札グリッド）
   =========================== */

/**
 * キャスト配列をもとに木札グリッドを再描画する
 * @param {Array} casts - 表示するキャストの配列
 */
function renderCastGrid(casts) {
    castGrid.innerHTML = '';

    if (casts.length === 0) {
        noResults.hidden = false;
        return;
    }
    noResults.hidden = true;

    // DocumentFragmentで一括挿入（パフォーマンス向上）
    const fragment = document.createDocumentFragment();

    casts.forEach((cast) => {
        const card = document.createElement('div');
        card.className = 'cast-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${cast.name}の詳細を見る`);

        const img = document.createElement('img');
        img.src = cast.image;
        img.alt = cast.name;
        img.className = 'cast-image';
        img.loading = 'lazy';
        img.addEventListener('error', () => { img.src = placeholderCard; });

        const nameEl = document.createElement('div');
        nameEl.className = 'cast-name';
        nameEl.textContent = cast.name;

        card.appendChild(img);
        card.appendChild(nameEl);

        // クリックで詳細ビューを開く
        card.addEventListener('click', () => openCastDetail(cast));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openCastDetail(cast);
            }
        });

        fragment.appendChild(card);
    });

    castGrid.appendChild(fragment);
}

/* ===========================
   キャスト詳細ビュー制御
   木札グリッドを非表示にし、背景のみの上に詳細を表示する
   =========================== */

/** 詳細を開く前にフォーカスしていた要素を保持 */
let previousFocus = null;

/**
 * 木札グリッドを隠してキャスト詳細ビューを表示する
 * @param {Object} cast - 表示するキャスト情報
 */
function openCastDetail(cast) {
    previousFocus = document.activeElement;

    // 詳細情報をセット
    detailImage.src = cast.image;
    detailImage.alt = cast.name;
    detailImage.onerror = () => { detailImage.src = placeholderDetail; };
    detailName.textContent = cast.name;
    detailDesc.textContent = cast.description;

    // 木札グリッドを非表示 → 詳細ビューを表示
    castCard.hidden = true;
    castDetail.hidden = false;
    document.body.style.overflow = 'hidden';

    // 閉じるボタンにフォーカス
    detailClose.focus();
}

/**
 * キャスト詳細ビューを閉じて木札グリッドに戻す
 */
function closeCastDetail() {
    if (castDetail.hidden) return;
    castDetail.hidden = true;
    castCard.hidden = false;
    document.body.style.overflow = '';

    if (previousFocus) {
        previousFocus.focus();
        previousFocus = null;
    }
}

detailClose.addEventListener('click', closeCastDetail);

// ESCキーで詳細ビューを閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !castDetail.hidden) {
        closeCastDetail();
    }
});

/* ===========================
   リアルタイム検索
   =========================== */
searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    const filtered = castData.filter((cast) =>
        cast.name.toLowerCase().includes(term)
    );
    renderCastGrid(filtered);
});

/* ===========================
   ローディング制御
   必要な画像を全て読み込んでからイントロを開始する
   =========================== */
function startWithLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    const introScreen   = document.getElementById('introScreen');
    const isMobile      = window.matchMedia('(max-width: 768px)').matches;

    // 読み込む画像リスト（背景3枚 + ヘッダー画像）
    const srcs = isMobile
        ? ['images/bg-about-sp.png', 'images/bg-cast-sp.png', 'images/bg-official-sp.png',
           'images/header-banner.png', 'images/header-logo.png']
        : ['images/bg-about-pc.png', 'images/bg-cast-pc.png', 'images/bg-official-pc.png',
           'images/header-banner.png', 'images/header-logo.png'];

    let loaded = 0;

    function onImageLoad() {
        loaded++;
        if (loaded < srcs.length) return;

        // 全画像読み込み完了 → ローディング画面をフェードアウト
        loadingScreen.classList.add('hidden');

        // フェードアウト完了後にイントロアニメーション開始
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            introScreen.classList.add('ready');

            // イントロ終了（2.5秒表示 + 1秒フェードアウト）後にメインをフェードイン
            setTimeout(() => {
                document.getElementById('mainContent').classList.add('visible');
            }, 3500);
        }, 800);
    }

    srcs.forEach((src) => {
        const img = new Image();
        img.onload  = onImageLoad;
        img.onerror = onImageLoad; // 読み込み失敗でも止まらないよう続行
        img.src = src;
    });
}

/* ===========================
   初期化
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('tab-about');
    renderCastGrid(castData);
    startWithLoading();
});
