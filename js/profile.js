const username = localStorage.getItem('trivial_username');
const fallbackAvatar = 'img/logo.png';
const $ = id => document.getElementById(id);
const setText = (id, value) => { const el = $(id); if (el) el.textContent = value ?? '—'; };
const formatDate = value => { if (!value || value === 'Не активна' || value === 'Отсутствует') return value || 'Не активна'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('ru-RU'); };

async function loadProfile() {
  if (!username) return;
  try {
    const response = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Профиль недоступен');
    const user = data.user;
    setText('profileUsername', user.username); setText('profileEmail', user.email); setText('profileRole', user.role || 'user');
    setText('profileSubscription', formatDate(user.subscription)); setText('profileCreated', formatDate(user.created_at)); setText('profileHwid', user.hwid || 'Не привязан');
    const avatar = $('profileAvatar'); if (avatar) avatar.src = user.avatar || localStorage.getItem('trivial_avatar') || fallbackAvatar;
    localStorage.setItem('trivial_user', JSON.stringify(user));
  } catch (error) { setText('profileLoadStatus', error.message); }
}

$('logoutButton')?.addEventListener('click', () => { ['trivial_username','trivial_user','trivial_avatar','trivial_role','trivial_hwid'].forEach(k => localStorage.removeItem(k)); location.href = 'signin.html'; });

document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  const value = $(button.dataset.copy)?.textContent || '';
  try { await navigator.clipboard.writeText(value); button.textContent = 'Скопировано'; setTimeout(() => button.textContent = 'Копировать', 1200); } catch { button.textContent = 'Не удалось'; }
}));

$('activateForm')?.addEventListener('submit', async event => {
  event.preventDefault(); const status = $('activateStatus'); const form = event.currentTarget;
  try {
    const response = await fetch('/api/activate', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ key:form.key.value.trim(), hwid:form.hwid.value.trim(), username }) });
    const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.message || 'Ошибка активации');
    status.textContent = data.message; status.className = 'status-message success'; loadProfile();
  } catch(error) { status.textContent = error.message; status.className = 'status-message error'; }
});

$('avatarForm')?.addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget; const status = $('avatarStatus');
  try {
    const response = await fetch('/api/update-avatar', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ username, avatar:form.avatar.value.trim() }) });
    const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.message || 'Ошибка обновления');
    $('profileAvatar').src = form.avatar.value.trim(); localStorage.setItem('trivial_avatar', form.avatar.value.trim()); status.textContent = data.message; status.className = 'status-message success';
  } catch(error) { status.textContent = error.message; status.className = 'status-message error'; }
});

loadProfile();
