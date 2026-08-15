const setStatus = (element, message, type = '') => {
  if (!element) return;
  element.textContent = message;
  element.className = `status-message ${type}`.trim();
};

async function submit(path, payload) {
  return window.DecideAPI.api(path, { method: 'POST', body: JSON.stringify(payload) });
}

function safeNextPage() {
  const value = new URLSearchParams(location.search).get('next');
  if (!value) return '/profile';
  try {
    const target = new URL(value, location.origin);
    if (target.origin !== location.origin) return '/profile';
    const allowed = new Set(['/', '/profile', '/purchase', '/admin-panel', '/payment-success', '/public-offer']);
    if (!allowed.has(target.pathname)) return '/profile';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '/profile';
  }
}

const signinForm = document.getElementById('signinForm');
if (signinForm) signinForm.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.getElementById('formStatus');
  const button = signinForm.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Входим…';
  setStatus(status, 'Проверяем данные…');
  try {
    const data = await submit('login', { username: signinForm.login.value.trim(), password: signinForm.password.value });
    window.DecideAPI.saveSession(data);
    setStatus(status, 'Вход выполнен. Открываем профиль…', 'success');
    setTimeout(() => { location.href = safeNextPage(); }, 300);
  } catch (error) {
    setStatus(status, error.message, 'error');
    button.disabled = false;
    button.textContent = 'Войти';
  }
});

const signupForm = document.getElementById('signupForm');
if (signupForm) signupForm.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.getElementById('formStatus');
  const button = signupForm.querySelector('button[type="submit"]');
  if (signupForm.password.value !== signupForm.passwordConfirm.value) {
    setStatus(status, 'Пароли не совпадают', 'error');
    return;
  }
  if (signupForm.password.value.length < 8) {
    setStatus(status, 'Пароль должен содержать минимум 8 символов', 'error');
    return;
  }
  button.disabled = true;
  button.textContent = 'Создаём…';
  setStatus(status, 'Создаём аккаунт…');
  try {
    const data = await submit('register', {
      username: signupForm.username.value.trim(),
      email: signupForm.email.value.trim(),
      password: signupForm.password.value
    });
    window.DecideAPI.saveSession(data);
    setStatus(status, 'Аккаунт создан. Открываем профиль…', 'success');
    setTimeout(() => { location.href = '/profile'; }, 300);
  } catch (error) {
    setStatus(status, error.message, 'error');
    button.disabled = false;
    button.textContent = 'Создать аккаунт';
  }
});
