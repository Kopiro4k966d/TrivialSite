document.querySelectorAll('[data-profile-tab]').forEach(button => button.addEventListener('click', () => {
  const target = button.dataset.profileTab;
  document.querySelectorAll('[data-profile-tab]').forEach(el => el.classList.toggle('active', el.dataset.profileTab === target));
  document.querySelectorAll('.panel-section').forEach(el => el.classList.toggle('active', el.id === target));
}));
