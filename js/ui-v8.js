(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const body = document.body;
  const revealItems = [...document.querySelectorAll('[data-reveal], .reveal')];
  const staggerGroups = [...document.querySelectorAll('[data-stagger]')];

  staggerGroups.forEach(group => {
    [...group.children].forEach((child, index) => child.style.setProperty('--stagger', Math.min(index, 8)));
  });

  document.querySelectorAll('.section').forEach(section => {
    if (!section.querySelector('.section-reveal-line')) {
      const line = document.createElement('i');
      line.className = 'section-reveal-line';
      section.prepend(line);
    }
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(el => el.classList.add('is-visible'));
    staggerGroups.forEach(el => el.classList.add('is-visible'));
    document.querySelectorAll('.section').forEach(el => el.classList.add('is-section-visible'));
  } else {
    body.classList.add('motion-ready');
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .1, rootMargin: '0px 0px -8% 0px' });
    revealItems.forEach(el => revealObserver.observe(el));
    staggerGroups.forEach(el => revealObserver.observe(el));

    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('is-section-visible');
      });
    }, { threshold: .08, rootMargin: '0px 0px -14% 0px' });
    document.querySelectorAll('.section').forEach(el => sectionObserver.observe(el));
  }

  const video = document.querySelector('.visuals-video');
  if (video && 'IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      });
    }, { threshold: .16 });
    videoObserver.observe(video);
  }

  const hashLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  if (hashLinks.length && 'IntersectionObserver' in window) {
    const sections = hashLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    const navObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      hashLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`));
    }, { rootMargin: '-24% 0px -58% 0px', threshold: [0,.2,.5] });
    sections.forEach(section => navObserver.observe(section));
  }
})();
