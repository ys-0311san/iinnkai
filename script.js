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
        yomi: 'たかにそ takaniso',
        role: 'オーナー',
        image: 'images/cast/takaniso.png',               // 木札グリッド用（焼き木調）
        detailImage: 'images/cast/takaniso_original.png', // 詳細ビュー用（オリジナル）
        description: 'ここに挨拶文や紹介を入れてください。',
        size: 'medium',
    },
    {
        id: 2,
        name: '狐乃さまあ',
        yomi: 'きつのさまあ kitsuno samaa',
        image: 'images/cast/samaa.png',
        detailImage: 'images/cast/samaa_original.png',
        description: '趣味はアニメ！漫画！\nやれることは全力で！\n今日もご主人様を癒していきます♡',
        size: 'small',
    },
    {
        id: 3,
        name: 'ぬの',
        yomi: 'ぬの nuno',
        image: 'images/cast/nuno.png',
        detailImage: 'images/cast/nuno_original.png',
        description: '',
    },
    {
        id: 4,
        name: 'きゅーとぬっこ',
        yomi: 'きゅーとぬっこ cute nukko cutenukko',
        image: 'images/cast/cute-nukko.png',
        detailImage: 'images/cast/cute-nukko_original.png',
        description: 'なでと癒しが得意なケモノです。疲れたらおいで！疲れてなくてもおいで！！',
        size: 'medium',
    },
    {
        id: 5,
        name: 'ウルフィー',
        yomi: 'うるふぃー urufii wolfie',
        image: 'images/cast/uryfi.png',
        detailImage: 'images/cast/uryfi_original.png',
        description: '',
    },
    {
        id: 6,
        name: 'うどん君',
        yomi: 'うどんくん udonkun udon',
        image: 'images/cast/udon_a.png',
        detailImage: 'images/cast/udon_a_original.png',
        description: 'あなたがトロトロになるくらい、ふんわりあったかく撫でてあげますね♡',
    },
    {
        id: 7,
        name: '天塚マウル',
        yomi: 'あまつかまうる amatsuka mauru',
        image: 'images/cast/amatuka-mauru.png',
        detailImage: 'images/cast/amatuka-mauru_original.png',
        description: '',
    },
    {
        id: 8,
        name: 'yuki__san',
        yomi: 'ゆきさん yukisan yuki',
        image: 'images/cast/yuki-san.png',
        detailImage: 'images/cast/yuki-san_original.png',
        description: 'いつもの子は過激すぎたのでクールに、ぜひお越しください。',
        size: 'medium',
    },
    {
        id: 9,
        name: '銀天のウェイン',
        yomi: 'ぎんてんのうぇいん ginten wayne',
        image: 'images/cast/ginten-wayne.png',
        detailImage: 'images/cast/ginten-wayne_original.png',
        description: '普段はソロで遊んでばかりですが、\n甘やかすことが大好きなピンクの火竜、\nエルダとして癒しをご提供いたします♡',
    },
    {
        id: 10,
        name: '蒼天-Souten-',
        yomi: 'そうてん souten',
        image: 'images/cast/souten.png',
        detailImage: 'images/cast/souten_original.png',
        description: '',
        size: 'medium',
    },
    {
        id: 11,
        name: '6ugca6',
        yomi: 'ばぐ bagu 6ugca6',
        image: 'images/cast/6ugca6.png',
        detailImage: 'images/cast/6ugca6_original.png',
        description: 'なでなで倶楽部の店長にしてあるときはメスドラ。あるときはメスケモ。\nなでなでと心地よい会話でその日の疲れを癒します',
        size: 'medium',
    },
    {
        id: 12,
        name: '竜ドラ',
        yomi: 'りゅうどら ryuudora ryudora',
        image: 'images/cast/ryudora.png',
        detailImage: 'images/cast/ryudora_original.png',
        description: '見た目はちょっと不良ちっくではあるが、無でるのが超大好きなオオカミの子だヨ。さぁ撫でるよ？準備は良いかい・・・？❤',
        size: 'medium',
    },
    {
        id: 13,
        name: 'ギラチー',
        yomi: 'ぎらちー girachii girachi',
        image: 'images/cast/girachii.png',
        detailImage: 'images/cast/girachii_original.png',
        description: '趣味は音楽と着ぐるみ？\nえっと…甘やかしたい派\n私"は"可愛くない',
        size: 'medium',
    },
    {
        id: 14,
        name: 'Esupishia',
        yomi: 'えすぴしあ esupishia',
        image: 'images/cast/eclixis.png',
        detailImage: 'images/cast/eclixis_original.png',
        description: 'デカいメスケモがお待ちしてます。',
        size: 'medium',
    },
    {
        id: 15,
        name: '音狐',
        yomi: 'おとこさん otokosan',
        image: 'images/cast/otokitsune.png',
        detailImage: 'images/cast/otokitsune_original.png',
        description: '',
        size: 'medium',
    },
    {
        id: 16,
        name: 'にっくん',
        yomi: 'にっくん nikkun',
        image: 'images/cast/nikkun.png',
        detailImage: 'images/cast/nikkun_original.png',
        description: 'やさしくなでなで、癒しの時間いかがですか？',
        size: 'medium',
    },
    {
        id: 18,
        name: '御神 琥夏',
        yomi: 'みかみこなつ mikami konatsu',
        image: 'images/cast/konatsu.png',
        detailImage: 'images/cast/konatsu_original.png',
        description: 'なでテクは持たず…。だけどデカさで圧倒します',
    },
    {
        id: 19,
        name: 'NARGA',
        yomi: 'なーが naaga narga',
        image: 'images/cast/narga.png',
        detailImage: 'images/cast/narga_original.png',
        description: '',
    },
    {
        id: 20,
        name: 'エルビィ',
        yomi: 'えるびぃ erubii elvie',
        image: 'images/cast/elvie.png',
        detailImage: 'images/cast/elvie_original.png',
        description: 'デッカいメスケモは最高ですよネ!!',
    },
    {
        id: 21,
        name: 'Shint_Akatohi',
        yomi: 'しんとあかとひ shint akatohi',
        image: 'images/cast/shint-akatohi.png',
        detailImage: 'images/cast/shint-akatohi_original.png',
        description: '',
    },
    {
        id: 22,
        name: 'ななみ',
        yomi: 'ななみ nanami',
        image: 'images/cast/nanami.png',
        detailImage: 'images/cast/nanami_original.png',
        description: 'なでなでとか色々やるよ〜\n楽しんでいってね(ˊᵕˋ)੭ ੈ❤︎',
    },
    {
        id: 23,
        name: '香辛料シナモン',
        yomi: 'こうしんりょうしなもん cinnamon',
        image: 'images/cast/cinnamon.png',
        detailImage: 'images/cast/cinnamon_original.png',
        description: '毛ずくろいが得意です！僕の元気をわけて差し上げますね！',
        size: 'small',
    },
    {
        id: 24,
        name: 'あかちゃん',
        yomi: 'あかちゃん akachan',
        image: 'images/cast/akachan.png',
        detailImage: 'images/cast/akachan_original.png',
        description: 'イベント発足時から所属してますが幽霊部員です。見かけたあなたはラッキー。',
        size: 'large',
    },
    {
        id: 25,
        name: 'にゃす',
        yomi: 'にゃす nyasu',
        image: 'images/cast/nyasu.png',
        detailImage: 'images/cast/nyasu_original.png',
        description: 'なんでも好きです。楽しい時間にしましょうねｖ',
        size: 'medium',
    },
    {
        id: 26,
        name: 'まかうす',
        yomi: 'まかうす makauso',
        image: 'images/cast/makauso.png',
        detailImage: 'images/cast/makauso_original.png',
        description: '防御0振り撫でキャスト　撫でるも撫でられるもあなた次第...！？',
        size: 'small',
    },
    {
        id: 27,
        name: 'あらり',
        yomi: 'あらり arari',
        image: 'images/cast/arari.png',
        detailImage: 'images/cast/arari_original.png',
        description: '甘やかすのがちょっと好きなケモノで～す。なで茶屋に来て楽しもうね～！',
        size: 'medium',
    },
    {
        id: 28,
        name: '井之上・NN',
        yomi: 'いのうえ nn inoue',
        image: 'images/cast/inoue-nn.png',
        detailImage: 'images/cast/inoue-nn_original.png',
        description: 'VRC、キャスト、接客初心者です。撫でる舐めるの接客を提供します。',
        size: 'large',
    },
    {
        id: 29,
        name: 'なおえ。',
        yomi: 'なおえ naoe',
        image: 'images/cast/naoe.png',
        detailImage: 'images/cast/naoe_original.png',
        description: '主に接客担当です。なかよくしてね。',
        size: 'medium',
    },
    {
        id: 30,
        name: '七色夢狐',
        yomi: 'なないろゆめこ nanairoyumeko',
        image: 'images/cast/nanairoyumeko.png',
        detailImage: 'images/cast/nanairoyumeko_original.png',
        description: '',
        size: 'medium',
    },
    {
        id: 31,
        name: '東洋桜狐',
        yomi: 'とうようさくらこ toyosakurako',
        image: 'images/cast/toyosakurako.png',
        detailImage: 'images/cast/toyosakurako_original.png',
        description: '',
        size: 'medium',
    },
    {
        id: 32,
        name: 'マルコ',
        yomi: 'まるこ maruko',
        image: 'images/cast/maruko.png',
        detailImage: 'images/cast/maruko_original.png',
        description: '',
        size: 'large',
    },
    {
        id: 33,
        name: 'かなめり',
        yomi: 'かなめり kanameri',
        image: 'images/cast/kanameri.png',
        detailImage: 'images/cast/kanameri_original.png',
        description: '不定期出勤で撫でてるよ。のんびりしにおいで～',
        size: 'medium',
    },
    {
        id: 35,
        name: 'ニコ',
        yomi: 'にこ niko',
        image: 'images/cast/niko.png',
        detailImage: 'images/cast/niko_original.png',
        description: 'いっぱい撫でていっぱいバグして日々の疲れを癒してあげる！！',
        size: 'medium',
    },
    {
        id: 34,
        name: 'MamLuua',
        yomi: 'まむるあ mamluua',
        image: 'images/cast/mamluua.png',
        detailImage: 'images/cast/mamluua_original.png',
        description: '「今、私を見たな。撫で回すから覚悟しな♡（初キャスト頑張ります♡）」',
        size: 'large',
    },
    // 以降は実際のキャストデータに差し替えてください
    ...Array.from({ length: 50 }, (_, i) => ({
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
   お知らせデータ定義
   新しいお知らせを追加する際はここに追記する
   =========================== */
const newsData = [
    {
        id: 1,
        date: '2026.04.10',
        isNew: true,
        title: 'メスケモ推進委員会 公式サイトオープン！',
        body: '公式ウェブサイトをオープンしました。キャスト情報やイベントスケジュールをご確認いただけます。',
        link: null,
        linkText: null,
        isExternal: false,
    },
];

/**
 * お知らせ一覧を描画する
 * newsData が空の場合は「お知らせはありません」を表示する
 */
function renderNewsList() {
    const newsList = document.getElementById('newsList');
    if (!newsList) return;

    if (newsData.length === 0) {
        newsList.innerHTML = '<p class="news-empty">現在お知らせはありません。</p>';
        return;
    }

    newsList.innerHTML = newsData.map((item) => {
        const badgeHtml = item.isNew
            ? '<span class="news-badge">NEW</span>'
            : '';
        const linkHtml = item.link
            ? `<a href="${item.link}" class="news-link"${item.isExternal ? ' target="_blank" rel="noopener noreferrer"' : ''}>${item.linkText || '詳しくはこちら →'}</a>`
            : '';

        return `
        <div class="news-item${item.isNew ? ' is-new' : ''}">
            <div class="news-item-header">
                ${badgeHtml}
                <span class="news-date">${item.date}</span>
            </div>
            <h3 class="news-title">${item.title}</h3>
            <p class="news-body">${item.body}</p>
            ${linkHtml}
        </div>`;
    }).join('');
}

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
   画像遅延読み込み（Intersection Observer）
   =========================== */

/** キャスト画像監視用 Intersection Observer インスタンス */
let castObserver = null;

/**
 * キャスト画像用の Intersection Observer を初期化する
 * 画面内（+50px先読み）に入った画像ラッパーを検知し、実画像を読み込む
 */
function initLazyLoad() {
    if (castObserver) return; // 既に初期化済みの場合はスキップ

    castObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                const wrapper = entry.target;
                const source  = wrapper.querySelector('source[data-srcset]');
                const img     = wrapper.querySelector('img[data-src]');
                const skeleton = wrapper.querySelector('.skeleton-image');

                // data-src がない場合は読み込み済み → 監視終了
                if (!img) {
                    castObserver.unobserve(wrapper);
                    return;
                }

                // WebP ファイルが用意できたら下記コメントを外して有効化する
                // （WebP非存在時に有効化するとブラウザが404を優先してPNGに戻らないため保留）
                // if (source) { source.srcset = source.dataset.srcset; }

                // 実画像を読み込む（data-src → src に昇格）
                img.src = img.dataset.src;
                img.removeAttribute('data-src');

                img.addEventListener('load', () => {
                    img.classList.add('loaded');
                    // フェードイン完了（0.45s）後にスケルトンを非表示
                    if (skeleton) {
                        setTimeout(() => { skeleton.style.display = 'none'; }, 450);
                    }
                }, { once: true });

                img.addEventListener('error', () => {
                    // 読み込み失敗時はSVGプレースホルダーを表示
                    img.src = placeholderCard;
                    img.classList.add('loaded');
                    if (skeleton) skeleton.style.display = 'none';
                }, { once: true });

                // 一度読み込んだら監視終了
                castObserver.unobserve(wrapper);
            });
        },
        {
            rootMargin: '50px', // 画面の50px手前から先読み開始
            threshold: 0,
        }
    );
}

/**
 * キャストタブ内の未読み込み画像ラッパーを Observer に登録する
 * すでに読み込み済みの要素（data-src なし）は登録しない
 */
function observeCastImages() {
    if (!castObserver) return;

    const castTab = document.getElementById('cast');
    if (!castTab) return;

    castTab.querySelectorAll('.lazy-wrapper').forEach((wrapper) => {
        // img[data-src] がある（未読み込み）ものだけ観察対象に追加
        if (wrapper.querySelector('img[data-src]')) {
            castObserver.observe(wrapper);
        }
    });
}

/**
 * タブ切り替え時に遅延読み込みを開始する
 * キャストタブのみ対象（他タブは初期読み込みのため不要）
 * @param {string} tabId - 開いたタブのID
 */
function lazyLoadTabImages(tabId) {
    if (tabId !== 'cast') return;
    initLazyLoad();
    observeCastImages();
}

/**
 * 指定キャストの前後 count 枚の詳細画像を先読みする
 * キャスト詳細を開いた際に呼ばれ、次・前のキャストへの操作を高速化する
 * @param {number} castId - 現在表示中のキャストID
 * @param {number} count  - 前後何枚先読みするか（デフォルト: 3）
 */
function preloadAdjacentImages(castId, count = 3) {
    // Coming Soon を除く実キャストのみ対象
    const realCasts = castData.filter((c) => !c.comingSoon);
    const currentIndex = realCasts.findIndex((c) => c.id === castId);
    if (currentIndex === -1) return;

    for (let i = 1; i <= count; i++) {
        [realCasts[currentIndex - i], realCasts[currentIndex + i]]
            .filter(Boolean)
            .forEach((cast) => {
                const preloadImg = new Image();
                preloadImg.src = cast.detailImage || cast.image;
            });
    }
}

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

    // 名刺ジェネレーターボタンをイベントタブのときだけ表示
    const cardGenBtn = document.getElementById('cardGenBtn');
    if (cardGenBtn) {
        cardGenBtn.classList.toggle('visible', targetId === 'about');
    }


    // スクロールをトップに戻す
    window.scrollTo({ top: 0, behavior: 'instant' });
    castCard.scrollTop = 0;

    // キャストタブが開かれた時に遅延読み込みを開始する
    lazyLoadTabImages(targetId);
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
            // Coming Soon カード
            // ★ castData内で最後のComingSoonは隠しVIP解放トリガー
            const isLastSlot = cast === castData[castData.length - 1];

            card.className = 'cast-card coming-soon' + (isLastSlot ? ' vip-slot' : '');

            const img = document.createElement('img');
            img.src = placeholderCard;
            img.alt = 'Coming Soon';
            img.className = 'cast-image';

            const label = document.createElement('div');
            label.className = 'coming-soon-label';
            label.textContent = 'Coming Soon';

            card.appendChild(img);
            card.appendChild(label);

            if (isLastSlot) {
                // 最後の枠だけクリック可能にしてVIPを解放
                card.setAttribute('role', 'button');
                card.setAttribute('tabindex', '0');
                card.setAttribute('aria-label', '???');
                card.addEventListener('click', discoverVipSlot);
                card.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        discoverVipSlot();
                    }
                });
            }
        } else {
            // 通常キャストカード（クリック可能）
            card.className = 'cast-card';
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `${cast.name}の詳細を見る`);

            // 文字数に応じてサイズクラスを付与（短い名前ほど大きく表示）
            const nameEl = document.createElement('div');
            const nameLen = cast.name.length;
            const nameSizeClass = nameLen <= 4 ? 'name-short' : nameLen <= 7 ? 'name-medium' : 'name-long';
            nameEl.className = `cast-name ${nameSizeClass}`;
            nameEl.textContent = cast.name;

            // 役職バッジ（カード上部に表示）
            if (cast.role) {
                const roleEl = document.createElement('div');
                roleEl.className = 'cast-role';
                roleEl.textContent = cast.role;
                card.appendChild(roleEl);
            }

            // 画像ラッパー（スケルトンと実画像を重ねるコンテナ）
            const imageWrapper = document.createElement('div');
            imageWrapper.className = 'cast-image-wrapper lazy-wrapper';

            // スケルトン（画像読み込み前のシマーアニメーション）
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton skeleton-image';
            skeleton.setAttribute('aria-hidden', 'true');
            imageWrapper.appendChild(skeleton);

            // WebP 対応の picture 要素（WebP → PNG のフォールバック）
            const picture = document.createElement('picture');

            // WebP ソース（data-srcset で遅延設定）
            const webpSource = document.createElement('source');
            webpSource.dataset.srcset = cast.image.replace(/\.[^.]+$/, '.webp');
            webpSource.type = 'image/webp';
            picture.appendChild(webpSource);

            // 実画像（data-src で遅延設定・初期状態は透明）
            const img = document.createElement('img');
            img.dataset.src = cast.image;
            img.alt = cast.name;
            img.className = 'cast-image lazy-load';

            img.addEventListener('load', () => {
                img.classList.add('loaded');
                // フェードイン（0.45s）完了後にスケルトンを非表示
                setTimeout(() => { skeleton.style.display = 'none'; }, 450);
            });
            img.addEventListener('error', () => {
                // 読み込み失敗時はSVGプレースホルダーを表示
                img.src = placeholderCard;
                img.classList.add('loaded');
                skeleton.style.display = 'none';
            });

            picture.appendChild(img);
            imageWrapper.appendChild(picture);

            card.appendChild(imageWrapper);
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

    // 前後3枚のキャスト詳細画像を先読み（次・前キャストへの切り替えを高速化）
    preloadAdjacentImages(cast.id);

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
   カタカナ→ひらがな変換 + 小文字化で統一比較
   =========================== */
function normalizeSearch(str) {
    return (str || '')
        // 全角英数字・記号→半角変換（ａ-ｚ、Ａ-Ｚ、０-９ など）
        .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
        .toLowerCase()
        // カタカナ→ひらがな変換（ァ-ヶ → ぁ-ん）
        .replace(/[\u30A1-\u30F6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

searchInput.addEventListener('input', () => {
    const term = normalizeSearch(searchInput.value.trim());
    if (!term) {
        renderCastGrid(castData);
        noResults.hidden = true;
    } else {
        const filtered = castData.filter((cast) => {
            return (
                normalizeSearch(cast.name).includes(term) ||
                normalizeSearch(cast.yomi || '').includes(term)
            );
        });
        renderCastGrid(filtered);
        noResults.hidden = filtered.length > 0;
    }

    // 再描画後に新しい画像要素をObserverに登録
    // （キャストタブが既に開かれObserver初期化済みの場合のみ動作）
    observeCastImages();
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

                // ムービー終了後、初期タブがaboutのとき名刺ジェネレーターボタンを表示
                const cardGenBtn = document.getElementById('cardGenBtn');
                if (cardGenBtn) {
                    cardGenBtn.classList.add('visible');
                }
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
   VIP解放トリガー
   最後のComing Soonカードをクリックするとフラグを保存して隠しページへ遷移
   =========================== */

/**
 * VIPスロット発見時に呼ばれる
 * - VIP発見モーダルを表示してXシェアできるようにする
 * - localStorageへの保存・ページ遷移はしない（29回クリックで初めて解放）
 */
function discoverVipSlot() {
    vipDiscovered = true;
    const modal = document.getElementById('vipDiscoverModal');
    if (modal) modal.hidden = false;
}

/* ===========================
   隠しページトリガー（ロゴを29回クリックでカードジェネレーターへ）
   =========================== */

/** ロゴクリック回数カウンター */
let secretClickCount = 0;
/** カウントリセット用タイマー */
let secretClickTimer = null;
/** VIPスロット発見済みフラグ（セッション中のみ有効） */
let vipDiscovered = false;

/**
 * ヘッダーバナーへのクリックを監視し、29回達成で隠しページへ遷移する
 * 3秒以内にクリックが続かなかった場合はカウントをリセットする
 */
function setupSecretTrigger() {
    const headerBanner = document.querySelector('.header-banner');
    if (!headerBanner) return;

    // クリックしやすいようにカーソルをデフォルトのまま（変えない）
    headerBanner.addEventListener('click', () => {
        secretClickCount++;

        // 3秒間クリックがなければリセット
        clearTimeout(secretClickTimer);
        secretClickTimer = setTimeout(() => {
            secretClickCount = 0;
        }, 3000);

        // 29回達成でジェネレーターへ遷移（VIPスロット発見済みの場合はVIPも解放）
        if (secretClickCount >= 29) {
            secretClickCount = 0;
            clearTimeout(secretClickTimer);
            if (vipDiscovered) {
                localStorage.setItem('mesukemo_vip_unlocked', '1');
            }
            window.location.href = 'secret-card.html';
        }
    });
}

/* ===========================
   漫画ライトボックス
   =========================== */

/** 漫画データ定義（複数対応） */
const mangaList = [
    {
        pages: [
            { src: 'images/manga-page1.jpg', alt: '漫画1 1ページ目' },
            { src: 'images/manga-page2.jpg', alt: '漫画1 2ページ目' },
            { src: 'images/manga-page3.jpg', alt: '漫画1 3ページ目' },
            { src: 'images/manga-page4.jpg', alt: '漫画1 4ページ目' },
        ],
    },
    {
        pages: [
            { src: 'images/manga2-page1.jpg', alt: '漫画2 1ページ目' },
        ],
    },
];

/** ライトボックスの状態 */
let mangaCurrentPage = 0;
let mangaCurrentIndex = 0; // どの漫画を開いているか

/** ライトボックスを開く */
function openMangaLightbox(mangaIndex = 0, pageIndex = 0) {
    mangaCurrentIndex = mangaIndex;
    mangaCurrentPage = pageIndex;
    const lb = document.getElementById('mangaLightbox');
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    updateMangaLightbox();
    document.getElementById('mangaLbClose').focus();
}

/** ライトボックスを閉じる */
function closeMangaLightbox() {
    const lb = document.getElementById('mangaLightbox');
    lb.hidden = true;
    // 既存のscroll制御（overflowX:hidden / overflowY:auto）に戻す
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'auto';
    const activePrev = document.querySelector(`.manga-preview[data-manga-index="${mangaCurrentIndex}"]`);
    if (activePrev) activePrev.focus();
}

/** 表示中のページを更新する */
function updateMangaLightbox() {
    const pages = mangaList[mangaCurrentIndex].pages;
    const img = document.getElementById('mangaLbImg');
    const page = pages[mangaCurrentPage];
    img.src = page.src;
    img.alt = page.alt;

    // 矢印の有効・無効切り替え（1ページのみのときは両方非表示）
    const prevBtn = document.getElementById('mangaLbPrev');
    const nextBtn = document.getElementById('mangaLbNext');
    prevBtn.disabled = (mangaCurrentPage === 0);
    nextBtn.disabled = (mangaCurrentPage === pages.length - 1);
    prevBtn.style.visibility = pages.length <= 1 ? 'hidden' : '';
    nextBtn.style.visibility = pages.length <= 1 ? 'hidden' : '';

    // インジケータードットを更新（1ページのみのときは非表示）
    const indicators = document.getElementById('mangaLbIndicators');
    indicators.innerHTML = '';
    if (pages.length > 1) {
        pages.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'manga-lb-dot' + (i === mangaCurrentPage ? ' active' : '');
            dot.setAttribute('aria-label', `${i + 1}ページ目へ`);
            dot.addEventListener('click', () => {
                mangaCurrentPage = i;
                updateMangaLightbox();
            });
            indicators.appendChild(dot);
        });
    }
}

/** ライトボックスのイベント設定 */
function setupMangaLightbox() {
    const previews = document.querySelectorAll('.manga-preview');
    const lb       = document.getElementById('mangaLightbox');
    const close    = document.getElementById('mangaLbClose');
    const prev     = document.getElementById('mangaLbPrev');
    const next     = document.getElementById('mangaLbNext');

    // 各サムネイルクリック・Enterキーで対応する漫画を開く
    previews.forEach((preview) => {
        const idx = parseInt(preview.dataset.mangaIndex ?? '0', 10);
        preview.addEventListener('click', () => openMangaLightbox(idx, 0));
        preview.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMangaLightbox(idx, 0); }
        });
    });

    // 閉じるボタン
    close.addEventListener('click', closeMangaLightbox);

    // 背景クリックで閉じる（画像エリア以外）
    lb.addEventListener('click', (e) => {
        if (e.target === lb) closeMangaLightbox();
    });

    // 前後ページボタン
    prev.addEventListener('click', () => {
        if (mangaCurrentPage > 0) { mangaCurrentPage--; updateMangaLightbox(); }
    });
    next.addEventListener('click', () => {
        const pages = mangaList[mangaCurrentIndex].pages;
        if (mangaCurrentPage < pages.length - 1) { mangaCurrentPage++; updateMangaLightbox(); }
    });

    // キーボード操作（矢印キー・ESC）
    document.addEventListener('keydown', (e) => {
        if (lb.hidden) return;
        const pages = mangaList[mangaCurrentIndex].pages;
        if (e.key === 'Escape') { closeMangaLightbox(); }
        if (e.key === 'ArrowLeft'  && mangaCurrentPage > 0) { mangaCurrentPage--; updateMangaLightbox(); }
        if (e.key === 'ArrowRight' && mangaCurrentPage < pages.length - 1) { mangaCurrentPage++; updateMangaLightbox(); }
    });

    // スワイプ操作（タッチデバイス）
    let touchStartX = 0;
    lb.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
        const pages = mangaList[mangaCurrentIndex].pages;
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) < 40) return;
        if (diff > 0 && mangaCurrentPage < pages.length - 1) { mangaCurrentPage++; updateMangaLightbox(); }
        if (diff < 0 && mangaCurrentPage > 0) { mangaCurrentPage--; updateMangaLightbox(); }
    }, { passive: true });
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
    renderNewsList();
    startWithLoading();

    // 漫画ライトボックスを設定
    setupMangaLightbox();

    // 隠しページトリガーを設定
    setupSecretTrigger();

    // 名刺ジェネレーターボタンの初期表示はムービー終了後に行う（startWithLoading内で制御）

    // ジェネレーターボタン：VIP発見済みならlocalStorageに保存してから遷移
    const cardGenBtnEl = document.getElementById('cardGenBtn');
    if (cardGenBtnEl) {
        cardGenBtnEl.addEventListener('click', (e) => {
            if (vipDiscovered) {
                localStorage.setItem('mesukemo_vip_unlocked', '1');
            }
        });
    }

    // VIP発見モーダルの閉じるボタン
    const vipDiscoverClose = document.getElementById('vipDiscoverClose');
    if (vipDiscoverClose) {
        vipDiscoverClose.addEventListener('click', () => {
            document.getElementById('vipDiscoverModal').hidden = true;
        });
    }
    // モーダル背景クリックでも閉じる
    const vipDiscoverModal = document.getElementById('vipDiscoverModal');
    if (vipDiscoverModal) {
        vipDiscoverModal.addEventListener('click', (e) => {
            if (e.target === vipDiscoverModal) vipDiscoverModal.hidden = true;
        });
    }
});
