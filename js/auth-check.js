(() => {
  if (document.body.hasAttribute('data-auth-required') && !window.TrivialAPI?.token()) {
    location.replace(`signin.html?next=${encodeURIComponent(location.pathname.split('/').pop() || 'profile.html')}`);
  }
})();
