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
        role: 'オーナー',
        image: 'images/cast/takaniso.png',
        description: 'ここに挨拶文や紹介を入れてください。',
    },
    // 以降は実際のキャストデータに差し替えてください
    ...Array.from({ length: 59 }, (_, i) => ({
        id: i + 2,
        name: 'Coming Soon',
        image: '',
        description: '',
        comingSoon: true,
    })),
];

/* ===========================
   背景画像マップ（タブID → PC/SP画像パス）
   =========================== */
const bgImages = {
    about:    { pc: 'images/bg-about-pc.png',    sp: 'images/bg-about-sp.png'    },
    cast:     { pc: 'images/bg-cast-pc.png',     sp: 'images/bg-cast-sp.png'     },
    official: { pc: 'images/bg-official-pc.png', sp: 'images/bg-official-sp.png' },
};

/** 背景クロスフェードのタイマーID（連打対策） */
let bgFadeTimer = null;

/**
 * 背景画像を0.6秒かけてクロスフェードで切り替える
 * @param {string} targetId - 切り替え先タブID
 */
function crossfadeBackground(targetId) {
    const isSP    = window.matchMedia('(max-width: 768px)').matches;
    const newSrc  = bgImages[targetId]?.[isSP ? 'sp' : 'pc'];
    if (!newSrc) return;

    const bgCurrent = document.getElementById('bgCurrent');
    const bgNext    = document.getElementById('bgNext');

    // 連打時は前回のタイマーをキャンセル
    if (bgFadeTimer) clearTimeout(bgFadeTimer);

    // bgNextに新しい背景をセットして不透明にする
    bgNext.style.backgroundImage = `url('${newSrc}')`;
    bgNext.style.opacity = '1';
    bgCurrent.style.opacity = '0';

    // フェード完了後にレイヤーを入れ替えてリセット
    bgFadeTimer = setTimeout(() => {
        bgCurrent.style.backgroundImage = `url('${newSrc}')`;
        bgCurrent.style.opacity = '1';
        bgNext.style.opacity = '0';
        bgFadeTimer = null;
    }, 650);
}

/* ===========================
   サイドバーデータ定義
   各タブのサブセクションをここに追加する
   =========================== */
const sidebarData = {
    about: [
        { id: 'about-main', label: 'イベントについて' },
        // 追加例: { id: 'about-schedule', label: 'スケジュール' },
    ],
    cast: [
        { id: 'cast-main', label: 'キャスト一覧' },
        // 追加例: { id: 'cast-schedule', label: 'シフト表' },
    ],
    official: [
        { id: 'official-main', label: '公式リンク' },
        // 追加例: { id: 'official-rules', label: 'ルール' },
    ],
};

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

    // 背景画像をクロスフェードで切り替え
    crossfadeBackground(targetId);

    // キャスト以外のタブに切り替えた場合、詳細ビューが開いていたら閉じる
    if (targetId !== 'cast') {
        closeCastDetail();
    }

    // タブ切り替え時にスクロール位置をトップに戻す
    window.scrollTo({ top: 0, behavior: 'instant' });
    // キャストグリッドのスクロールもリセット
    castCard.scrollTop = 0;
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

        if (cast.comingSoon) {
            // Coming Soon カード（クリック不可・グレーアウト）
            card.className = 'cast-card coming-soon';

            const img = document.createElement('img');
            img.src = placeholderCard;
            img.alt = 'Coming Soon';
            img.className = 'cast-image';

            const label = document.createElement('div');
            label.className = 'coming-soon-label';
            label.textContent = 'Coming Soon';

            card.appendChild(img);
            card.appendChild(label);
        } else {
            // 通常キャストカード（クリック可能）
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

            // 役職がある場合はバッジを追加
            if (cast.role) {
                const roleEl = document.createElement('div');
                roleEl.className = 'cast-role';
                roleEl.textContent = cast.role;
                card.appendChild(roleEl);
            }

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
        }

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
    // 既存の役職バッジを削除してから再生成
    const existingRole = detailName.nextElementSibling;
    if (existingRole && existingRole.classList.contains('detail-role')) {
        existingRole.remove();
    }
    if (cast.role) {
        const roleEl = document.createElement('div');
        roleEl.className = 'detail-role';
        roleEl.textContent = cast.role;
        detailName.after(roleEl);
    }
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
   サイドバー制御
   =========================== */

/**
 * 指定タブのサイドバーを生成する
 * @param {string} tabId - タブID（'about' | 'cast' | 'official'）
 */
function renderSidebar(tabId) {
    const sidebar = document.getElementById(`sidebar-${tabId}`);
    if (!sidebar) return;

    const items = sidebarData[tabId] || [];

    // サブセクションが1つ以下の場合はタブバー不要（hidden属性で非表示）
    if (items.length <= 1) {
        sidebar.hidden = true;
        return;
    }
    sidebar.hidden = false;
    sidebar.innerHTML = '';

    const nav = document.createElement('nav');
    nav.className = 'sidebar-nav';

    items.forEach((item, index) => {
        const btn = document.createElement('button');
        btn.className = 'sidebar-item' + (index === 0 ? ' active' : '');
        btn.textContent = item.label;
        btn.dataset.sectionId = item.id;
        btn.setAttribute('aria-current', index === 0 ? 'page' : 'false');
        btn.addEventListener('click', () => activateSubSection(tabId, item.id));
        nav.appendChild(btn);
    });

    sidebar.appendChild(nav);
}

/**
 * サブセクションを切り替える
 * @param {string} tabId     - 親タブID
 * @param {string} sectionId - 表示するサブセクションID
 */
function activateSubSection(tabId, sectionId) {
    // サブセクションの表示切替
    const section = document.getElementById(tabId);
    if (!section) return;
    section.querySelectorAll('.sub-section').forEach((el) => {
        el.classList.remove('active');
    });
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');

    // サイドバーのアクティブ状態を更新
    const sidebar = document.getElementById(`sidebar-${tabId}`);
    if (sidebar) {
        sidebar.querySelectorAll('.sidebar-item').forEach((btn) => {
            const isActive = btn.dataset.sectionId === sectionId;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
    }

    // サブセクション切替時にスクロールをトップへ
    window.scrollTo({ top: 0, behavior: 'instant' });
}

/* ===========================
   初期化
   =========================== */
document.addEventListener('DOMContentLoaded', () => {
    // 初期背景（aboutタブ）を即座にセット
    const isSPInit = window.matchMedia('(max-width: 768px)').matches;
    const initBg = bgImages.about[isSPInit ? 'sp' : 'pc'];
    const bgCurrent = document.getElementById('bgCurrent');
    if (bgCurrent) bgCurrent.style.backgroundImage = `url('${initBg}')`;

    // 全タブのサイドバーを生成
    Object.keys(sidebarData).forEach(renderSidebar);
    renderCastGrid(castData);
    startWithLoading();
});
