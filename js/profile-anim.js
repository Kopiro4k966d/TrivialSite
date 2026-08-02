document.querySelectorAll('[data-profile-tab]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-profile-tab]').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.panel-section').forEach(el => el.classList.remove('active'));
  button.classList.add('active');
  document.getElementById(button.dataset.profileTab)?.classList.add('active');
}));
