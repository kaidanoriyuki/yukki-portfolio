// メニューの開閉（スマートフォン用）
const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.global-nav');

menuButton.addEventListener('click', () => {
  const isOpen = menu.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

// メニュー内のリンクを押したら閉じる
menu.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  });
});

// Works：選んだ技術タグを含む作品だけ表示する
const filterButtons = document.querySelectorAll('.filter');
const workCards = document.querySelectorAll('.work-card');
const noResults = document.querySelector('.no-results');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedTag = button.dataset.filter;
    let visibleCount = 0;

    filterButtons.forEach((item) => {
      const isSelected = item === button;
      item.classList.toggle('is-active', isSelected);
      item.setAttribute('aria-pressed', String(isSelected));
    });

    workCards.forEach((card) => {
      const tags = card.dataset.tags.split(' ');
      const shouldShow = selectedTag === 'all' || tags.includes(selectedTag);
      card.hidden = !shouldShow;
      if (shouldShow) visibleCount++;
    });

    noResults.hidden = visibleCount !== 0;
  });
});


// ============================================================
// 08 ページガイド（Ver.17）
// 葉っぱを押すと開始。各セクションへ2秒で移動、4秒間滞在。
// 「次へ」「戻る」はいつでも使用でき、押すと待ち時間をリセット。
// それ以外の手動操作で自動案内を終了します。
// ============================================================
(() => {
  const leaf = document.querySelector('.scroll-leaf');
  const panel = document.querySelector('#auto-guide');
  const status = document.querySelector('#auto-guide-status');
  const current = document.querySelector('#auto-guide-current');
  const next = document.querySelector('#auto-guide-next');
  const backButton = document.querySelector('#auto-guide-back');
  const forwardButton = document.querySelector('#auto-guide-forward');
  if (!leaf || !panel || !status || !current || !next || !backButton || !forwardButton) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const sectionTitles = new Map(
    ['about', 'skills', 'works', 'contact'].map(id => [
      id, document.querySelector(`#${id} .draw-title`)
    ])
  );
  function drawTitle(targetIndex) {
    const id = targets[targetIndex]?.el?.id;
    const title = sectionTitles.get(id);
    if (title) title.classList.add('is-drawn');
  }
  const moveDuration = 2000;
  const pauseDuration = 4000;

  // HEROは「戻る」専用。通常の自動案内はAbout Meから始まります。
  const targets = [
    { el: document.querySelector('#top'), label: 'Home' },
    { el: document.querySelector('#about'), label: 'About Me' },
    { el: document.querySelector('#skills'), label: 'Skills' },
    { el: document.querySelector('#works'), label: 'Works' },
    { el: document.querySelector('#contact'), label: 'Contact' },
    { el: document.querySelector('.site-footer'), label: 'Footer' }
  ].filter(item => item.el);

  if (targets.length < 2) return;

  let started = false;
  let stopped = false;
  let frameId = 0;
  let index = 1;
  let phase = 'move';
  let phaseStart = null;
  let fromY = 0;
  let toY = 0;

  function stopGuide() {
    if (!started || stopped) return;
    stopped = true;
    cancelAnimationFrame(frameId);
    panel.hidden = true;
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function destinationY(item, targetIndex) {
    const bottom = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const top = item.el.getBoundingClientRect().top + window.scrollY;
    // 最初のAbout Meだけ画面の中央に配置する（Ver.12から維持）。
    const wanted = targetIndex === 1
      ? top + item.el.offsetHeight / 2 - innerHeight / 2
      : top;
    return Math.max(0, Math.min(wanted, bottom));
  }

  function updatePanel() {
    current.textContent = targets[index].label;
    // About Me=芽、Skills=葉、Works以降=花。戻ると成長段階も戻ります。
    const plant = panel.querySelector('.guide-plant');
    if (plant) plant.dataset.stage = String(index <= 1 ? 1 : index === 2 ? 2 : 3);
    status.textContent = phase === 'move' ? '移動中' : 'ご案内中';
    next.textContent = index + 1 < targets.length
      ? '次は ' + targets[index + 1].label
      : '最後のセクションです';
    backButton.disabled = index === 0;
    forwardButton.disabled = index === targets.length - 1;
  }

  function startMove(targetIndex) {
    cancelAnimationFrame(frameId);
    index = targetIndex;
    fromY = window.scrollY;
    toY = destinationY(targets[index], index);
    phase = 'move';
    phaseStart = null;
    // About Meに再訪したときにも下線がスーッと描かれるようリセット。
    const title = sectionTitles.get(targets[targetIndex]?.el?.id);
    if (title) title.classList.remove('is-drawn');
    updatePanel();
    frameId = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (stopped) return;
    if (document.hidden) {
      // 非表示タブで経過した時間は進行に含めません。
      phaseStart = null;
      frameId = requestAnimationFrame(tick);
      return;
    }
    if (phaseStart === null) phaseStart = now;
    const elapsed = now - phaseStart;

    if (phase === 'move') {
      const t = Math.min(1, elapsed / moveDuration);
      window.scrollTo({ top: fromY + (toY - fromY) * ease(t), behavior: 'instant' });
      if (t >= 1) {
        phase = 'pause';
        phaseStart = now;
        // スクロールが止まった瞬間に、About Meの下線を左から表示。
        drawTitle(index);
        updatePanel();
      }
    } else if (elapsed >= pauseDuration) {
      if (index === targets.length - 1) {
        stopGuide();
        return;
      }
      startMove(index + 1);
      return;
    }
    frameId = requestAnimationFrame(tick);
  }

  // ガイドボタンは自動案内を止めず、目的地を切り替えます。
  backButton.addEventListener('click', () => {
    if (stopped || !started || index === 0) return;
    startMove(index - 1);
  });
  forwardButton.addEventListener('click', () => {
    if (stopped || !started || index >= targets.length - 1) return;
    startMove(index + 1);
  });

  // 自分で操作し始めたらガイドを終了。ガイドのボタンだけは例外。
  ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
      if (event.target.closest?.('#auto-guide')) return;
      if (eventName === 'pointerdown' && leaf.contains(event.target)) return;
      stopGuide();
    }, { passive: true });
  });

  leaf.addEventListener('click', (event) => {
    event.preventDefault();
    // 2回目以降も、葉っぱを押せばAbout Meから案内をやり直せます。
    // 進行中・停止後どちらでも古いアニメーションを解除してから再始動。
    cancelAnimationFrame(frameId);
    if (reduceMotion.matches) {
      document.querySelector('#about')?.scrollIntoView({ behavior: 'instant' });
      return;
    }
    // ガイドを再開するときは全見出しを線なしに戻す。
    // 以降は各セクションで停止した瞬間だけ順に描画する。
    sectionTitles.forEach(title => title?.classList.remove('is-drawn'));
    started = true;
    stopped = false;
    panel.hidden = false;
    startMove(1);
  });

  // 手動スクロール時も、見出しが画面の中央付近に来たら描画します。
  // 初回は非表示。自動ガイド中はスクロール途中では描かず、停止時に描画します。
  if ('IntersectionObserver' in window) {
    const titleObserver = new IntersectionObserver((entries) => {
      if (started && !stopped) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-drawn');
      });
    }, { rootMargin: '-35% 0px -35% 0px', threshold: 0 });
    sectionTitles.forEach((title) => { if (title) titleObserver.observe(title); });
  } else {
    // IntersectionObserverが使えない環境でも、見出しが中央付近に来たら描画。
    let checking = false;
    window.addEventListener('scroll', () => {
      if (checking || (started && !stopped)) return;
      checking = true;
      requestAnimationFrame(() => {
        sectionTitles.forEach((title) => {
          if (!title) return;
          const rect = title.getBoundingClientRect();
          if (rect.top < innerHeight * .65 && rect.bottom > innerHeight * .35) {
            title.classList.add('is-drawn');
          }
        });
        checking = false;
      });
    }, { passive: true });
  }

  reduceMotion.addEventListener('change', (event) => {
    if (event.matches) stopGuide();
  });
})();


// ============================================================
// Ver.30：Works 詳細ポップアップ＆スライド
// slides配列に画像を追加すれば、各作品3〜5枚に拡張できます。
// src: null は差し替え前の仮スライドとして表示します。
// ============================================================
(() => {
  const works = [
    { title: 'Cafe Lumiere', description: 'カフェの雰囲気を伝える、シンプルで落ち着いた架空サイトを制作しました。', tech: 'HTML / CSS / JavaScript', slides: [
      {src:'assets/work-cafe.webp',caption:'作品イメージ'}, {src:null,caption:'下層ページ（画像準備中）'}, {src:null,caption:'スマートフォン表示（画像準備中）'}
    ]},
    { title: 'Andante', description: '観光地をイメージした、動きのあるデザインの架空サイトです。', tech: 'HTML / CSS / JavaScript', slides: [
      {src:'assets/work-andante.webp',caption:'作品イメージ'}, {src:null,caption:'下層ページ（画像準備中）'}, {src:null,caption:'スマートフォン表示（画像準備中）'}
    ]},
    { title: 'ZOO LOGICAL', description: 'WordPressで構築した、動物園の情報を紹介する架空サイトです。', tech: 'WordPress / PHP', slides: [
      {src:'assets/work-zoo.webp',caption:'作品イメージ'}, {src:null,caption:'下層ページ（画像準備中）'}, {src:null,caption:'スマートフォン表示（画像準備中）'}
    ]}
  ];
  const modal = document.getElementById('work-modal');
  if (!modal) return;
  const dialog = modal.querySelector('.work-modal-dialog');
  const frame = document.getElementById('work-slide-frame');
  const dots = document.getElementById('work-slide-dots');
  const prev = document.getElementById('work-slide-prev');
  const next = document.getElementById('work-slide-next');
  let active = 0, slide = 0, lastFocus = null;

  function render() {
    const data = works[active];
    const item = data.slides[slide];
    frame.replaceChildren();
    if (item.src) {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = data.title + '：' + item.caption;
      frame.append(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'work-slide-placeholder';
      placeholder.textContent = '画像を準備中';
      frame.append(placeholder);
    }
    document.getElementById('work-slide-caption').textContent = item.caption;
    document.getElementById('work-slide-count').textContent = `${slide + 1} / ${data.slides.length}`;
    dots.replaceChildren();
    data.slides.forEach((entry, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'work-slide-dot' + (index === slide ? ' is-active' : '');
      dot.setAttribute('aria-label', `${index + 1}枚目を表示`);
      dot.setAttribute('aria-current', index === slide ? 'true' : 'false');
      dot.addEventListener('click', () => { slide = index; render(); });
      dots.append(dot);
    });
  }
  function open(index) {
    if (!works[index]) return;
    active = index; slide = 0; lastFocus = document.activeElement;
    const data = works[active];
    document.getElementById('work-modal-title').textContent = data.title;
    document.getElementById('work-modal-description').textContent = data.description;
    document.getElementById('work-modal-tech').textContent = data.tech;
    render();
    modal.hidden = false;
    document.body.classList.add('work-modal-open');
    dialog.focus();
  }
  function close() {
    modal.hidden = true;
    document.body.classList.remove('work-modal-open');
    lastFocus?.focus();
  }
  document.querySelectorAll('[data-work-open]').forEach(button => {
    button.addEventListener('click', () => open(Number(button.dataset.workOpen)));
  });
  // カードの画像・余白・説明文を含め、どこを押しても詳細を開く。
  document.querySelectorAll('.work-card[data-work]').forEach(card => {
    card.addEventListener('click', event => {
      if (event.target.closest('[data-work-open]')) return; // ボタン側の処理と二重にしない
      open(Number(card.dataset.work));
    });
    card.addEventListener('keydown', event => {
      if (event.target !== card) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(Number(card.dataset.work));
      }
    });
  });
  modal.querySelectorAll('[data-close-work]').forEach(button => button.addEventListener('click', close));
  prev.addEventListener('click', () => { slide = (slide - 1 + works[active].slides.length) % works[active].slides.length; render(); });
  next.addEventListener('click', () => { slide = (slide + 1) % works[active].slides.length; render(); });
  document.addEventListener('keydown', event => {
    if (modal.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); prev.click(); }
    if (event.key === 'ArrowRight') { event.preventDefault(); next.click(); }
    if (event.key === 'Tab') {
      const focusable = [...modal.querySelectorAll('button:not([disabled])')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();
