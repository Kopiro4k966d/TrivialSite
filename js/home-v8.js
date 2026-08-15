(() => {
  const counters = [...document.querySelectorAll('[data-counter]')];
  if (!counters.length) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = el => {
    const target = Number(el.dataset.counter || 0);
    if (!Number.isFinite(target)) return;
    if (reduceMotion) { el.textContent = target.toLocaleString('ru-RU'); return; }
    const duration = 1100;
    const start = performance.now();
    const tick = now => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('ru-RU');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!('IntersectionObserver' in window)) { counters.forEach(animate); return; }
  const observer = new IntersectionObserver((entries, io) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      animate(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold:.5 });
  counters.forEach(el => observer.observe(el));
})();
