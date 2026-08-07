(() => {
  if (document.body.hasAttribute('data-auth-required') && !window.TrivialAPI?.token()) {
    const current = `${location.pathname.replace(/\.html$/i, '') || '/'}${location.search}${location.hash}`;
    location.replace(`/signin?next=${encodeURIComponent(current)}`);
  }
})();
