(() => {
  const username = localStorage.getItem('trivial_username');
  if (!username && document.body.hasAttribute('data-auth-required')) location.replace('signin.html');
})();
