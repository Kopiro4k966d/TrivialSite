const setStatus = (element, message, type = '') => {
  if (!element) return;
  element.textContent = message;
  element.className = `status-message ${type}`.trim();
};

async function submit(path, payload) {
  return window.TrivialAPI.api(path, { method: 'POST', body: JSON.stringify(payload) });
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
    window.TrivialAPI.saveSession(data);
    setStatus(status, 'Вход выполнен. Открываем профиль…', 'success');
    setTimeout(() => location.href = 'profile.html', 300);
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
  button.disabled = true;
  button.textContent = 'Создаём…';
  setStatus(status, 'Создаём аккаунт…');
  try {
    const data = await submit('register', {
      username: signupForm.username.value.trim(),
      email: signupForm.email.value.trim(),
      password: signupForm.password.value
    });
    window.TrivialAPI.saveSession(data);
    setStatus(status, 'Аккаунт создан. Открываем профиль…', 'success');
    setTimeout(() => location.href = 'profile.html', 300);
  } catch (error) {
    setStatus(status, error.message, 'error');
    button.disabled = false;
    button.textContent = 'Создать аккаунт';
  }
});
