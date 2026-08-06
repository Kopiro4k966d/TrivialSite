const $ = id => document.getElementById(id);
const setText = (id, value) => { const el = $(id); if (el) el.textContent = value ?? '—'; };
const formatDate = value => {
  if (!value) return 'Не активна';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Не активна' : date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
};
let profileUser = null;

function updateDownloadState(user) {
  const active = window.TrivialAPI.isSubscriptionActive(user);
  const button = $('downloadLauncher');
  const state = $('downloadState');
  const badge = $('subscriptionBadge');
  if (button) {
    button.disabled = !active;
    button.classList.toggle('is-disabled', !active);
    button.textContent = active ? 'Скачать Trivial Launcher' : 'Нужна активная подписка';
  }
  if (state) state.textContent = active
    ? `Доступ открыт${user.subscription_days ? ` · осталось ${user.subscription_days} дн.` : ''}`
    : 'Активируйте ключ, чтобы скачать лаунчер.';
  if (badge) {
    badge.textContent = active ? 'Подписка активна' : 'Подписка не активна';
    badge.classList.toggle('active', active);
  }
}

async function loadProfile() {
  try {
    const data = await window.TrivialAPI.api('profile');
    const user = data.user;
    profileUser = user;
    window.TrivialAPI.saveSession({ user });
    setText('profileUsername', user.username);
    setText('profileEmail', user.email);
    setText('profileRole', user.role || 'user');
    setText('profileRoleCard', user.role || 'user');
    setText('profileSubscription', formatDate(user.subscription));
    setText('profileCreated', formatDate(user.created_at));
    setText('profileHwid', user.hwid || 'Будет привязан при первом запуске');
    const avatar = $('profileAvatar');
    if (avatar) avatar.src = user.avatar || 'img/logo.png';
    updateDownloadState(user);
    setText('profileLoadStatus', 'Аккаунт, подписка и загрузка лаунчера.');
  } catch (error) {
    setText('profileLoadStatus', error.message);
    if (error.status === 401) location.replace('signin.html');
  }
}

$('logoutButton')?.addEventListener('click', () => {
  window.TrivialAPI.clearSession();
  location.href = 'signin.html';
});

document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  const value = $(button.dataset.copy)?.textContent || '';
  try {
    await navigator.clipboard.writeText(value);
    const original = button.textContent;
    button.textContent = 'Скопировано';
    setTimeout(() => button.textContent = original, 1200);
  } catch { button.textContent = 'Не удалось'; }
}));

$('activateForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const status = $('activateStatus');
  const form = event.currentTarget;
  try {
    const data = await window.TrivialAPI.api('activate', { method: 'POST', body: JSON.stringify({ key: form.key.value.trim() }) });
    status.textContent = data.message;
    status.className = 'status-message success';
    form.reset();
    await loadProfile();
  } catch (error) {
    status.textContent = error.message;
    status.className = 'status-message error';
  }
});

$('avatarForm')?.addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $('avatarStatus');
  try {
    const data = await window.TrivialAPI.api('update-avatar', { method: 'POST', body: JSON.stringify({ avatar: form.avatar.value.trim() }) });
    $('profileAvatar').src = data.avatar || 'img/logo.png';
    status.textContent = data.message;
    status.className = 'status-message success';
  } catch (error) {
    status.textContent = error.message;
    status.className = 'status-message error';
  }
});

$('downloadLauncher')?.addEventListener('click', async () => {
  if (!profileUser || !window.TrivialAPI.isSubscriptionActive(profileUser)) return;
  const button = $('downloadLauncher');
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Подготавливаем загрузку…';
  try {
    const response = await fetch('/api/download/launcher', { headers: { Authorization: `Bearer ${window.TrivialAPI.token()}` } });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'Не удалось скачать лаунчер');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TrivialLauncher.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    $('downloadState').textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
});

loadProfile();
