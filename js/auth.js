const setStatus = (element, message, type = '') => {
  if (!element) return;
  element.textContent = message;
  element.className = `status-message ${type}`.trim();
};

const saveUser = (user) => {
  localStorage.setItem('trivial_username', user.username);
  localStorage.setItem('trivial_user', JSON.stringify(user));
  if (user.avatar) localStorage.setItem('trivial_avatar', user.avatar);
  if (user.role) localStorage.setItem('trivial_role', user.role);
};

const submitJson = async (url, payload) => {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  let data;
  try { data = await response.json(); } catch { throw new Error('Сервер вернул некорректный ответ'); }
  if (!response.ok || !data.success) throw new Error(data.message || 'Не удалось выполнить запрос');
  return data;
};

const signinForm = document.getElementById('signinForm');
if (signinForm) signinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('formStatus');
  const button = signinForm.querySelector('button[type="submit"]');
  button.disabled = true; button.textContent = 'Входим…'; setStatus(status, 'Проверяем данные…');
  try {
    const data = await submitJson('/api/login', { username: signinForm.login.value.trim(), password: signinForm.password.value });
    saveUser(data.user); setStatus(status, 'Вход выполнен. Открываем профиль…', 'success');
    setTimeout(() => location.href = 'profile.html', 450);
  } catch (error) { setStatus(status, error.message, 'error'); button.disabled = false; button.textContent = 'Войти'; }
});

const signupForm = document.getElementById('signupForm');
if (signupForm) signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.getElementById('formStatus');
  const button = signupForm.querySelector('button[type="submit"]');
  if (signupForm.password.value !== signupForm.passwordConfirm.value) { setStatus(status, 'Пароли не совпадают', 'error'); return; }
  button.disabled = true; button.textContent = 'Создаём…'; setStatus(status, 'Создаём аккаунт…');
  try {
    const data = await submitJson('/api/register', { username: signupForm.username.value.trim(), email: signupForm.email.value.trim(), password: signupForm.password.value });
    saveUser(data.user); setStatus(status, 'Аккаунт создан. Открываем профиль…', 'success');
    setTimeout(() => location.href = 'profile.html', 450);
  } catch (error) { setStatus(status, error.message, 'error'); button.disabled = false; button.textContent = 'Создать аккаунт'; }
});
