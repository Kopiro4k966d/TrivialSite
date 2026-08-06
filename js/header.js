(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
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
  const user = window.TrivialAPI?.user();
  const accountLink = document.querySelector('[data-account-link]');
  if (accountLink && user?.username) {
    accountLink.textContent = user.username;
    accountLink.href = 'profile.html';
  }
})();
