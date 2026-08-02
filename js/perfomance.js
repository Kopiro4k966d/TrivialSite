(() => {
  const revealItems = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) { revealItems.forEach(el => el.classList.add('is-visible')); return; }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
  }, { threshold: .12 });
  revealItems.forEach(el => observer.observe(el));
})();
