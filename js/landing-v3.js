(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = [...document.querySelectorAll('[data-dv-reveal]')];
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(el => el.classList.add('dv-visible'));
  } else {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('dv-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -48px' });
    revealItems.forEach(el => observer.observe(el));
  }

  const counterSection = document.querySelector('.dv-metric-grid');
  let didCount = false;
  const startCounters = () => {
    if (didCount) return;
    didCount = true;
    document.querySelectorAll('[data-dv-counter]').forEach(el => {
      const target = Number(el.dataset.dvCounter || 0);
      if (reduceMotion) { el.textContent = target.toLocaleString('ru-RU'); return; }
      const started = performance.now();
      const duration = 1000;
      const frame = now => {
        const p = Math.min(1, (now - started) / duration);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * ease).toLocaleString('ru-RU');
        if (p < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  };
  if (counterSection && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { startCounters(); io.disconnect(); }
    }, { threshold: .35 });
    io.observe(counterSection);
  } else startCounters();

  const slides = [
    { title: 'Настройка мира без перегруза', text: 'Атмосфера, небо и эффекты собраны в одной компактной панели.', module: 'World visuals', rows: ['Atmosphere','Sky shader','Bloom'], hue: 0 },
    { title: 'Цели остаются читаемыми', text: 'Метки и визуальные подсказки аккуратно вписываются в игровой кадр.', module: 'Target visuals', rows: ['Target ESP','Name tags','Visibility'], hue: 14 },
    { title: 'HUD только с нужным', text: 'Компактные виджеты, уведомления и информация без лишнего визуального шума.', module: 'Interface', rows: ['HUD layout','Widgets','Notifications'], hue: -12 },
    { title: 'Профили в один клик', text: 'Сохраняйте наборы настроек и быстро переключайтесь между ними.', module: 'Profiles', rows: ['Main profile','Performance','Visual preset'], hue: 28 }
  ];
  let current = 0;
  const game = document.getElementById('dvGameView');
  const title = document.getElementById('dvSlideTitle');
  const text = document.getElementById('dvSlideText');
  const module = document.getElementById('dvModuleTitle');
  const rows = ['dvRow1','dvRow2','dvRow3'];
  function renderSlide(index) {
    current = (index + slides.length) % slides.length;
    const slide = slides[current];
    if (title) title.textContent = slide.title;
    if (text) text.textContent = slide.text;
    if (module) module.textContent = slide.module;
    rows.forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = slide.rows[i]; });
    if (game) game.style.setProperty('--slide-hue', slide.hue + 'deg');
    document.querySelectorAll('[data-dv-slide]').forEach(el => el.classList.toggle('active', Number(el.dataset.dvSlide) === current));
  }
  document.querySelectorAll('[data-dv-slide]').forEach(el => el.addEventListener('click', () => renderSlide(Number(el.dataset.dvSlide))));
  document.querySelector('.dv-prev')?.addEventListener('click', () => renderSlide(current - 1));
  document.querySelector('.dv-next')?.addEventListener('click', () => renderSlide(current + 1));

  document.querySelectorAll('.dv-switch').forEach(sw => sw.addEventListener('click', () => sw.classList.toggle('on')));

  if (!reduceMotion) {
    let timer = setInterval(() => renderSlide(current + 1), 6500);
    document.querySelector('.dv-client-stage')?.addEventListener('mouseenter', () => clearInterval(timer));
  }
})();
