(() => {
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const selectors = [
    '.auth-brand-center','.auth-shell','.profile-top','.profile-layout',
    '.price-page-grid','.pricing-note','.admin-card','.state-card',
    '.legal > *','.notfound > *','.site-footer .footer-grid','.site-footer .footer-bottom'
  ];
  const items = [];
  selectors.forEach(selector => document.querySelectorAll(selector).forEach(el => {
    if (el.closest('.home-main')) return;
    if (items.includes(el)) return;
    el.setAttribute('data-ui-reveal','');
    el.style.setProperty('--ui-delay', `${Math.min(items.length % 4,3) * 65}ms`);
    items.push(el);
  }));

  if (!items.length) return;
  body.classList.add('ui-v7-ready');
  const show = el => el.classList.add('ui-v7-visible');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach(show);
    return;
  }
  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      show(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold:.1, rootMargin:'0px 0px -6% 0px' });
  requestAnimationFrame(() => items.forEach(el => io.observe(el)));
})();
