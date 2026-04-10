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
        image: 'images/cast/takaniso.png',               // 木札グリッド用（焼き木調）
        detailImage: 'images/cast/takaniso_original.png', // 詳細ビュー用（オリジナル）
        description: 'ここに挨拶文や紹介を入れてください。',
        size: 'medium',
    },
    {
        id: 2,
        name: '狐乃さまあ',
        image: 'images/cast/samaa.png',
        detailImage: 'images/cast/samaa_original.png',
        description: '趣味はアニメ！漫画！\nやれることは全力で！\n今日もご主人様を癒していきます♡',
        size: 'small',
    },
    {
        id: 3,
        name: 'ぬの',
        image: 'images/cast/nuno.png',
        detailImage: 'images/cast/nuno_original.png',
        description: '',
    },
    {
        id: 4,
        name: 'Cute Nukko',
        image: 'images/cast/cute-nukko.png',
        detailImage: 'images/cast/cute-nukko_original.png',
        description: '',
        size: 'medium',
    },
    {
        id: 5,
        name: 'ウルフィー',
        image: 'images/cast/uryfi.png',
        detailImage: 'images/cast/uryfi_original.png',
        description: '',
    },
    {
        id: 6,
        name: 'うどん君',
        image: 'images/cast/udon_a.png',
        detailImage: 'images/cast/udon_a_original.png',
        description: '',
    },
    {
        id: 7,
        name: '天塚マウル',
        image: 'images/cast/amatuka-mauru.png',
        detailImage: 'images/cast/amatuka-mauru_original.png',
        description: '',
    },
    {
        id: 8,
        name: 'yuki__san',
        image: 'images/cast/yuki-san.png',
        detailImage: 'images/cast/yuki-san_original.png',
        description: 'いつもの子は過激すぎたのでクールに、ぜひお越しください。',
        size: 'medium',
    },
    // 以降は実際のキャストデータに差し替えてください
    ...Array.from({ length: 52 }, (_, i) => ({
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

/**
 * 背景画像を即時切り替える
 * @param {string} targetId - 切り替え先タブID
 */
function crossfadeBackground(targetId) {
    const isSP  = window.matchMedia('(max-width: 768px)').matches;
    const newSrc = bgImages[targetId]?.[isSP ? 'sp' : 'pc'];
    if (!newSrc) return;

    const bgCurrent = document.getElementById('bgCurrent');
    bgCurrent.style.backgroundImage = `url('${newSrc}')`;
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
const tabButtons   = document.querySelectorAll('.tab-button, .drawer-item'); // PC用タブ＋スマホ用ドロワーアイテム
const tabContents  = document.querySelectorAll('.tab-content');
const castGrid     = document.getElementById('castGrid');
const searchInput  = document.getElementById('castSearch');
const noResults    = document.getElementById('noResults');
const castCard        = document.getElementById('castCard');     // 木札グリッドのカード
const castDetail      = document.getElementById('castDetail');   // 詳細ビュー
const castDetailVisual = castDetail.querySelector('.cast-detail-visual'); // キャラ画像エリア
const detailImage     = document.getElementById('detailImage');
const detailName      = document.getElementById('detailName');
const detailDesc      = document.getElementById('detailDescription');
const detailClose     = document.getElementById('detailClose');

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
        ' font-family="sans-serif" font-size="18" fill="#8b6f47">📸 写真撮影中</text>' +
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
        ' font-family="sans-serif" font-size="24" fill="#8b6f47">📸 写真撮影中</text>' +
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
    // ドロワーアイテムのアクティブ状態を更新
    tabButtons.forEach((btn) => {
        const isActive = btn.dataset.tab === targetId;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', String(isActive));
    });

    // コンテンツと背景を同時に切り替え（遅延なし）
    tabContents.forEach((section) => {
        section.classList.toggle('active', section.id === targetId);
    });

    // 背景クロスフェード開始
    crossfadeBackground(targetId);

    // キャスト以外に切り替えた場合は詳細ビューを閉じる
    if (targetId !== 'cast') {
        closeCastDetail();
    }

    // メニューを閉じる
    closeDrawer();

    // スクロールをトップに戻す
    window.scrollTo({ top: 0, behavior: 'instant' });
    castCard.scrollTop = 0;
}

tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

/* ===========================
   サイドメニュー（ドロワー）開閉制御
   =========================== */
const sideDrawer    = document.getElementById('sideDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const menuToggle    = document.getElementById('menuToggle');
const drawerClose   = document.getElementById('drawerClose');

/** ドロワーを開く */
function openDrawer() {
    sideDrawer.classList.add('open');
    drawerOverlay.classList.add('open');
    menuToggle.setAttribute('aria-expanded', 'true');
    sideDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    drawerClose.focus();
}

/** ドロワーを閉じる */
function closeDrawer() {
    sideDrawer.classList.remove('open');
    drawerOverlay.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    sideDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflowY = 'auto';
}

menuToggle.addEventListener('click', openDrawer);
drawerClose.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

// ESCキーでもドロワーを閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sideDrawer.classList.contains('open')) {
        closeDrawer();
    }
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

    // 前の画像をクリアしてから新しい画像をセット（前のキャストが一瞬表示されるのを防ぐ）
    detailImage.src = '';
    detailImage.alt = cast.name;
    detailImage.onerror = () => { detailImage.src = placeholderDetail; };
    detailImage.src = cast.detailImage || cast.image;
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

    // 常に大（デフォルト）で開く・ボタンで割り当てサイズに切り替え
    castDetailVisual.classList.remove('size-medium', 'size-small');

    // トグル状態をリセットして大（デフォルト）表示に戻す
    sizeToggled = false;
    sizeCheckBtn.classList.remove('active');

    // 割り当てサイズを保持・大の子はボタン非表示
    currentCastSize = cast.size || 'large';
    sizeCheckBtn.hidden = currentCastSize === 'large';

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
    document.body.style.overflowY = 'auto';

    // サイズトグルをリセット
    sizeToggled = false;
    sizeCheckBtn.classList.remove('active');
    castDetailVisual.classList.remove('size-medium', 'size-small');

    if (previousFocus) {
        previousFocus.focus();
        previousFocus = null;
    }
}

detailClose.addEventListener('click', closeCastDetail);

/* ===========================
   サイズ確認ボタン制御
   割り当てサイズ ↔ 大（デフォルト）をトグルする
   =========================== */
const sizeCheckBtn = document.getElementById('sizeCheckBtn');

/** 現在表示中のキャストの割り当てサイズを保持 */
let currentCastSize = 'large';
/** トグル状態（true=割り当てサイズ表示中、false=大表示中） */
let sizeToggled = false;

sizeCheckBtn.addEventListener('click', () => {
    sizeToggled = !sizeToggled;
    castDetailVisual.classList.remove('size-medium', 'size-small');

    if (sizeToggled) {
        // 割り当てサイズに切り替え
        if (currentCastSize === 'medium') castDetailVisual.classList.add('size-medium');
        if (currentCastSize === 'small')  castDetailVisual.classList.add('size-small');
        sizeCheckBtn.classList.add('active');
    } else {
        // 大（デフォルト）に戻す
        sizeCheckBtn.classList.remove('active');
    }
});

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
                // アニメーション終了後にスクロールを解除（overflow-xは横スクロール防止のため残す）
                document.body.style.overflowX = 'hidden';
                document.body.style.overflowY = 'auto';
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
