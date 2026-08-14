(() => {
  const header = document.querySelector('.home-header');
  const setHeaderState = () => header?.classList.toggle('is-scrolled', window.scrollY > 28);
  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  const reveal = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -30px' });
    reveal.forEach(el => observer.observe(el));
  } else reveal.forEach(el => el.classList.add('is-revealed'));

  let countersStarted = false;
  const counterRoot = document.querySelector('.hero-stats');
  const runCounters = () => {
    if (countersStarted) return;
    countersStarted = true;
    document.querySelectorAll('[data-counter]').forEach(el => {
      const target = Number(el.dataset.counter || 0);
      const start = performance.now();
      const duration = 900;
      const frame = now => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased).toLocaleString('ru-RU');
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  };
  if (counterRoot && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { runCounters(); observer.disconnect(); }
    }, { threshold: .2 });
    observer.observe(counterRoot);
  } else runCounters();
})();
