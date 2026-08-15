(() => {
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsObserver = 'IntersectionObserver' in window;

  body.classList.add('home-v7-ready');

  const hero = document.querySelector('.hero');
  if (hero) {
    const heroItems = [
      hero.querySelector('.pill'),
      hero.querySelector('h1'),
      hero.querySelector('p'),
      hero.querySelector('.hero-actions'),
      hero.querySelector('.hero-scroll')
    ].filter(Boolean);
    heroItems.forEach((el, i) => {
      el.classList.add('v7-motion-item');
      el.style.setProperty('--v7-delay', `${80 + i * 90}ms`);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => heroItems.forEach(el => el.classList.add('v7-visible'))));
  }

  const sections = [...document.querySelectorAll('.home-main > .section')];
  sections.forEach(section => {
    section.classList.add('v7-section');

    const primary = [
      section.querySelector('.section-heading'),
      section.querySelector('.showcase-video'),
      section.querySelector('.metrics-shell'),
      section.querySelector('.demo-copy'),
      section.querySelector('.demo-card')
    ].filter(Boolean);

    section.querySelectorAll('.price-card').forEach(el => primary.push(el));
    primary.forEach((el, i) => {
      el.classList.add('v7-motion-item');
      el.style.setProperty('--v7-delay', `${Math.min(i, 4) * 90}ms`);
    });

    const staggerGroups = [
      ...section.querySelectorAll('.metric-copy,.metric'),
      ...section.querySelectorAll('.demo-list > div'),
      ...section.querySelectorAll('.price-features > span')
    ];
    staggerGroups.forEach((el, i) => {
      el.classList.add('v7-stagger-child');
      el.style.setProperty('--v7-child-delay', `${70 + (i % 6) * 55}ms`);
    });
  });

  const revealSection = section => {
    section.classList.add('v7-section-visible');
    section.querySelectorAll('.v7-motion-item').forEach(el => el.classList.add('v7-visible'));
  };

  if (reduceMotion || !supportsObserver) {
    sections.forEach(revealSection);
  } else {
    const sectionObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        revealSection(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.09, rootMargin: '0px 0px -9% 0px' });
    sections.forEach(section => sectionObserver.observe(section));
  }

  const counterRoot = document.querySelector('.hero-stats');
  let countersStarted = false;
  const runCounters = () => {
    if (countersStarted) return;
    countersStarted = true;
    document.querySelectorAll('[data-counter]').forEach(el => {
      const target = Number(el.dataset.counter || 0);
      if (reduceMotion) {
        el.textContent = target.toLocaleString('ru-RU');
        return;
      }
      const start = performance.now();
      const duration = 1100;
      const frame = now => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased).toLocaleString('ru-RU');
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  };

  if (counterRoot && supportsObserver && !reduceMotion) {
    const io = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      runCounters();
      io.disconnect();
    }, { threshold: .3 });
    io.observe(counterRoot);
  } else runCounters();

  if (!reduceMotion && document.documentElement.scrollHeight > window.innerHeight + 300) {
    let progress = document.querySelector('.scroll-progress');
    if (!progress) {
      progress = document.createElement('div');
      progress.className = 'scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      body.appendChild(progress);
    }
    let ticking = false;
    const update = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / max))})`;
      ticking = false;
    };
    const request = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', request, { passive:true });
    addEventListener('resize', request, { passive:true });
  }

  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const anchorSections = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if (links.length && anchorSections.length && supportsObserver) {
    const setActive = id => links.forEach(link => {
      const on = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const navObserver = new IntersectionObserver(entries => {
      const active = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (active?.target?.id) setActive(active.target.id);
    }, { rootMargin:'-30% 0px -58% 0px', threshold:[0,.2,.5,.8] });
    anchorSections.forEach(section => navObserver.observe(section));
    setActive(anchorSections[0].id);
  }

  const video = document.querySelector('.visuals-video');
  if (video && supportsObserver) {
    const videoObserver = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) video.play().catch(() => {});
      else video.pause();
    }, { threshold:.08, rootMargin:'160px 0px' });
    videoObserver.observe(video);
  }
})();
