(() => {
  const header = document.querySelector('.home-header');
  const setHeaderState = () => header?.classList.toggle('is-scrolled', window.scrollY > 40);
  setHeaderState();
  window.addEventListener('scroll', setHeaderState, { passive: true });

  const modal = document.getElementById('videoModal');
  const close = modal?.querySelector('.video-modal-close');
  const videos = modal ? [...modal.querySelectorAll('video')] : [];

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    videos.forEach(video => {
      video.pause();
      video.classList.remove('is-active');
    });
    document.body.style.overflow = '';
  };

  document.querySelectorAll('[data-video-open]').forEach(button => {
    button.addEventListener('click', () => {
      if (!modal) return;
      const video = document.getElementById(button.dataset.videoOpen);
      if (!video) return;
      videos.forEach(item => item.classList.remove('is-active'));
      video.classList.add('is-active');
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      video.play().catch(() => {});
    });
  });

  close?.addEventListener('click', closeModal);
  modal?.addEventListener('click', event => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
  });
})();
