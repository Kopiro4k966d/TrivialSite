const $ = id => document.getElementById(id);
const setText = (id, value) => { const element = $(id); if (element) element.textContent = value ?? '—'; };
const formatDate = value => {
  if (!value) return 'Не активна';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Не активна' : date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
};
let profileUser = null;

function updateDownloadState(user) {
  const active = window.DecideAPI.isSubscriptionActive(user);
  const button = $('downloadLauncher');
  const state = $('downloadState');
  const badge = $('subscriptionBadge');
  if (button) {
    button.disabled = !active;
    button.classList.toggle('is-disabled', !active);
    button.textContent = active ? 'Скачать Decide Visuals Launcher' : 'Нужна активная подписка';
  }
  if (state) state.textContent = active
    ? `Доступ открыт${user.subscription_days ? ` · осталось ${user.subscription_days} дн.` : ''}`
    : 'Активируйте ключ, чтобы скачать лаунчер.';
  if (badge) {
    badge.textContent = active ? 'Подписка активна' : 'Подписка не активна';
    badge.classList.toggle('active', active);
  }
}

function addAdminLink(user) {
  if (!['creator', 'admin'].includes(String(user.role || '').toLowerCase())) return;
  const nav = document.querySelector('.side-nav');
  if (!nav || nav.querySelector('[data-admin-link]')) return;
  const link = document.createElement('a');
  link.href = '/admin-panel';
  link.dataset.adminLink = '';
  link.className = 'btn';
  link.textContent = 'Админ-панель';
  nav.appendChild(link);
}

async function loadProfile() {
  try {
    const data = await window.DecideAPI.api('profile');
    const user = data.user;
    profileUser = user;
    window.DecideAPI.saveSession({ user });
    setText('profileUsername', user.username);
    setText('profileEmail', user.email);
    setText('profileRole', user.role || 'user');
    setText('profileRoleCard', user.role || 'user');
    setText('profileSubscription', formatDate(user.subscription));
    setText('profileCreated', formatDate(user.created_at));
    setText('profileHwid', user.hwid || 'Будет привязан при первом запуске');
    const avatar = $('profileAvatar');
    if (avatar) avatar.src = user.avatar || '/img/logo.svg';
    updateDownloadState(user);
    addAdminLink(user);
    setText('profileLoadStatus', 'Аккаунт, подписка и загрузка лаунчера.');
  } catch (error) {
    setText('profileLoadStatus', error.message);
    if (error.status === 401) location.replace('/signin?next=/profile');
  }
}

$('logoutButton')?.addEventListener('click', () => {
  window.DecideAPI.clearSession();
  location.href = '/signin';
});

document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  const value = $(button.dataset.copy)?.textContent || '';
  try {
    await navigator.clipboard.writeText(value);
    const original = button.textContent;
    button.textContent = 'Скопировано';
    setTimeout(() => { button.textContent = original; }, 1200);
  } catch {
    button.textContent = 'Не удалось';
  }
}));

$('activateForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const status = $('activateStatus');
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Проверяем…';
  status.textContent = 'Проверяем ключ…';
  status.className = 'status-message';
  try {
    const data = await window.DecideAPI.api('activate', { method: 'POST', body: JSON.stringify({ key: form.key.value.trim() }) });
    status.textContent = data.message;
    status.className = 'status-message success';
    form.reset();
    await loadProfile();
  } catch (error) {
    status.textContent = error.message;
    status.className = 'status-message error';
  } finally {
    button.disabled = false;
    button.textContent = 'Активировать';
  }
});

$('avatarForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $('avatarStatus');
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const data = await window.DecideAPI.api('update-avatar', { method: 'POST', body: JSON.stringify({ avatar: form.avatar.value.trim() }) });
    $('profileAvatar').src = data.avatar || '/img/logo.svg';
    if (profileUser) {
      profileUser.avatar = data.avatar || null;
      window.DecideAPI.saveSession({ user: profileUser });
    }
    status.textContent = data.message;
    status.className = 'status-message success';
  } catch (error) {
    status.textContent = error.message;
    status.className = 'status-message error';
  } finally {
    button.disabled = false;
  }
});

$('downloadLauncher')?.addEventListener('click', async () => {
  if (!profileUser || !window.DecideAPI.isSubscriptionActive(profileUser)) return;
  const button = $('downloadLauncher');
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Подготавливаем загрузку…';
  try {
    const response = await fetch('/api/download/launcher', { headers: { Authorization: `Bearer ${window.DecideAPI.token()}` } });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'Не удалось скачать лаунчер');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'DecideVisualsLauncher.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    $('downloadState').textContent = error.message;
  } finally {
    const active = window.DecideAPI.isSubscriptionActive(profileUser);
    button.disabled = !active;
    button.classList.toggle('is-disabled', !active);
    button.textContent = active ? original : 'Нужна активная подписка';
  }
});

loadProfile();
