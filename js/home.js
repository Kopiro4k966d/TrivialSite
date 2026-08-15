(() => {
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  requestAnimationFrame(() => body.classList.add('motion-ready'));

  // Soft reveal on scroll. The content is visible by default if JS is unavailable.
  const revealItems = [...document.querySelectorAll('[data-reveal]')];

  document.querySelectorAll('.pricing-grid .price-card').forEach((el, index) => {
    el.dataset.reveal = '';
    if (!el.style.getPropertyValue('--delay')) el.style.setProperty('--delay', `${index * 70}ms`);
    if (!revealItems.includes(el)) revealItems.push(el);
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(el => el.classList.add('is-revealed'));
  } else {
    body.classList.add('reveal-ready');
    const observer = new IntersectionObserver((entries, io) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.13, rootMargin: '0px 0px -7% 0px' });

    requestAnimationFrame(() => revealItems.forEach(el => observer.observe(el)));
  }

  // Counters only start when the metric block becomes visible.
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
      const duration = 1050;
      const frame = now => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * eased).toLocaleString('ru-RU');
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  };

  if (counterRoot && 'IntersectionObserver' in window && !reduceMotion) {
    const counterObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      runCounters();
      counterObserver.disconnect();
    }, { threshold: 0.25 });
    counterObserver.observe(counterRoot);
  } else {
    runCounters();
  }

  // Tiny page progress indicator. Updates are batched with requestAnimationFrame.
  if (!reduceMotion && document.body.scrollHeight > window.innerHeight + 300) {
    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progress);

    let progressTicking = false;
    const updateProgress = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const value = Math.min(1, Math.max(0, window.scrollY / max));
      progress.style.transform = `scaleX(${value})`;
      progressTicking = false;
    };
    const requestProgress = () => {
      if (progressTicking) return;
      progressTicking = true;
      requestAnimationFrame(updateProgress);
    };
    updateProgress();
    window.addEventListener('scroll', requestProgress, { passive: true });
    window.addEventListener('resize', requestProgress, { passive: true });
  }

  // Highlight the section that is currently being viewed.
  const anchorLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = anchorLinks
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if (anchorLinks.length && sections.length && 'IntersectionObserver' in window) {
    const setActive = id => {
      anchorLinks.forEach(link => {
        const active = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };

    const sectionObserver = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setActive(visible.target.id);
    }, { rootMargin: '-28% 0px -58% 0px', threshold: [0, 0.2, 0.5, 0.8] });

    sections.forEach(section => sectionObserver.observe(section));
    setActive(sections[0].id);
  }

  // Pause the showcase video outside the viewport to reduce CPU/GPU use.
  const video = document.querySelector('.visuals-video');
  if (video && 'IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver(entries => {
      const visible = entries[0]?.isIntersecting;
      if (visible) video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.08, rootMargin: '180px 0px' });
    videoObserver.observe(video);
  }
})();
