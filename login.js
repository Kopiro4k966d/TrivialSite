(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  const update = () => header?.classList.toggle('is-scrolled', window.scrollY > 24);
  update(); window.addEventListener('scroll', update, { passive: true });

  if (toggle && nav) {
    toggle.addEventListener('click', event => {
      event.stopPropagation();
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', event => {
      if (event.target.closest('a')) { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('click', event => {
      if (!header?.contains(event.target)) { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  const user = window.DecideAPI?.user();
  document.querySelectorAll('[data-account-link]').forEach(link => {
    if (user?.username) { link.textContent = user.username; link.href = '/profile'; }
  });
})();
