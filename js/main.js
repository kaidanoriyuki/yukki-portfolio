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


// Works detail: Web projects show real pages; graphic projects show one full image.
(() => {
  const works = [
    { title:'ZOO LOGICAL', type:'web', description:'動物園をテーマにした架空サイト。お知らせ・施設紹介・動物紹介・お問い合わせなどを制作しました。', tech:'HTML / CSS / JavaScript', points:'共通ナビゲーションと複数ページ、トップページのスライドショーを制作。', url:'projects/zoo/index.html', slides:[
      {src:'projects/zoo/index.html',caption:'トップページ'}, {src:'projects/zoo/about.html',caption:'動物園について'}, {src:'projects/zoo/guide.html',caption:'利用ガイド'}, {src:'projects/zoo/animals.html',caption:'動物紹介'}, {src:'projects/zoo/contact.html',caption:'お問い合わせ'}] },
    { title:'Wedding', type:'web', description:'結婚式場をテーマにした架空のWebサイトです。', tech:'HTML / CSS / JavaScript', points:'写真を使ったビジュアルと、下層ページへの導線を制作。', url:'projects/wedding/index.html', slides:[
      {src:'projects/wedding/index.html',caption:'トップページ'}, {src:'projects/wedding/concept.html',caption:'コンセプト'}, {src:'projects/wedding/plan.html',caption:'プラン'}, {src:'projects/wedding/fair.html',caption:'ブライダルフェア'}, {src:'projects/wedding/contact.html',caption:'お問い合わせ'}] },
    { title:'Yukki Portfolio', type:'web-images', description:'制作実績・スキル・プロフィールをまとめたポートフォリオサイトです。', tech:'HTML / CSS / JavaScript / GitHub Pages', points:'作品フィルターや詳細表示など、見やすさと操作性を意識。', url:null, slides:[
      {src:'assets/hero-scene.webp',caption:'トップページのメインビジュアル'}, {src:'assets/about-illustration.webp',caption:'プロフィールのビジュアル'}, {src:'assets/footer-scene.webp',caption:'お問い合わせのビジュアル'}] },
    { title:'ホームページ集客相談会', type:'graphic', description:'ホームページ集客相談会の告知バナーです。', tech:'Adobe Illustrator / Adobe Photoshop', points:'訴求するメッセージと参加導線を視覚的に整理。', url:'assets/banner-30.png', slides:[{src:'assets/banner-30.png',caption:'広告バナー'}] },
    { title:'MOMOIRO KITCHEN CAR FES', type:'graphic', description:'キッチンカーイベントを告知するポスターです。', tech:'Adobe Illustrator / Adobe Photoshop', points:'写真と縦書きコピーを組み合わせた告知デザイン。', url:'assets/poster-momoiro.jpg', slides:[{src:'assets/poster-momoiro.jpg',caption:'イベントポスター'}] }
  ];
  const modal = document.getElementById('work-modal');
  if (!modal) return;
  const dialog=modal.querySelector('.work-modal-dialog');
  const frame=document.getElementById('work-slide-frame');
  const dots=document.getElementById('work-slide-dots');
  const prev=document.getElementById('work-slide-prev');
  const next=document.getElementById('work-slide-next');
  const caption=document.getElementById('work-slide-caption');
  const count=document.getElementById('work-slide-count');
  let active=0, slide=0, lastFocus=null;
  function render(){
    const data=works[active], item=data.slides[slide];
    frame.replaceChildren();
    if(data.type==='web'){
      const iframe=document.createElement('iframe');
      iframe.src=item.src; iframe.title=data.title+'：'+item.caption;
      iframe.loading='eager'; iframe.setAttribute('scrolling','yes');
      frame.append(iframe);
    } else {
      const img=document.createElement('img');
      img.src=item.src; img.alt=data.title+'：'+item.caption;
      frame.append(img);
    }
    caption.textContent=item.caption;
    count.textContent=data.slides.length>1 ? `${slide+1} / ${data.slides.length}` : '';
    const multi=data.slides.length>1;
    prev.hidden=!multi; next.hidden=!multi; dots.hidden=!multi;
    dots.replaceChildren();
    if(multi) data.slides.forEach((entry,i)=>{
      const dot=document.createElement('button');dot.type='button';
      dot.className='work-slide-dot'+(i===slide?' is-active':'');
      dot.setAttribute('aria-label',entry.caption+'を表示');
      dot.setAttribute('aria-current',i===slide?'true':'false');
      dot.addEventListener('click',()=>{slide=i;render();});dots.append(dot);
    });
  }
  function open(index){
    if(!works[index]) return;
    active=index;slide=0;lastFocus=document.activeElement;
    const data=works[active];
    modal.classList.toggle('is-graphic',data.type==='graphic');
    modal.classList.toggle('is-web',data.type==='web');
    document.getElementById('work-modal-title').textContent=data.title;
    document.getElementById('work-modal-description').textContent=data.description;
    document.getElementById('work-modal-tech').textContent=data.tech;
    document.getElementById('work-modal-points').textContent=data.points;
    const linkBox=document.getElementById('work-modal-link');linkBox.replaceChildren();
    const a=document.createElement('a');a.className='work-detail-action';
    a.href=data.url || '#top';
    if(data.url){a.target='_blank';a.rel='noopener noreferrer';}
    else {a.href='#top';a.addEventListener('click',e=>{e.preventDefault();close();window.scrollTo({top:0,behavior:'smooth'});});}
    a.textContent=data.type==='graphic'?'作品画像を大きく開く ↗':data.url?'実際のサイトを見る ↗':'ポートフォリオのトップへ ↗';
    linkBox.append(a);
    render();modal.hidden=false;document.body.classList.add('work-modal-open');dialog.focus();
  }
  function close(){modal.hidden=true;frame.replaceChildren();document.body.classList.remove('work-modal-open');lastFocus?.focus();}
  document.querySelectorAll('[data-work-open]').forEach(b=>b.addEventListener('click',()=>open(Number(b.dataset.workOpen))));
  document.querySelectorAll('.work-card[data-work]').forEach(card=>{
    card.addEventListener('click',e=>{if(!e.target.closest('[data-work-open]'))open(Number(card.dataset.work));});
    card.addEventListener('keydown',e=>{if(e.target===card&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open(Number(card.dataset.work));}});
  });
  modal.querySelectorAll('[data-close-work]').forEach(b=>b.addEventListener('click',close));
  const change=n=>{const length=works[active].slides.length;if(length<2)return;slide=(slide+n+length)%length;render();};
  prev.addEventListener('click',()=>change(-1));next.addEventListener('click',()=>change(1));
  document.addEventListener('keydown',e=>{
    if(modal.hidden)return;
    if(e.key==='Escape'){e.preventDefault();close();}
    if(e.key==='ArrowLeft'){e.preventDefault();change(-1);}
    if(e.key==='ArrowRight'){e.preventDefault();change(1);}
    if(e.key==='Tab'){
      const focusable=[...modal.querySelectorAll('button:not([hidden]),a[href]')].filter(el=>el.getClientRects().length);
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
})();;


// v39: 謝辞の一度きりのスクロール演出（ほかの機能から独立）
(() => {
  const thanks = document.querySelector('.contact-thanks-copy');
  if (!thanks || !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  thanks.classList.add('thanks-animate-ready');
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      thanks.classList.add('thanks-is-visible');
      observer.disconnect();
      break;
    }
  }, { threshold: 0.25 });
  observer.observe(thanks);
})();

