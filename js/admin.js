(() => {
  const byId = id => document.getElementById(id);
  const form = byId('keyCreator');
  const status = byId('adminStatus');
  const generated = byId('generatedKey');
  const copyButton = byId('copyGeneratedKey');
  const submitButton = form?.querySelector('button[type="submit"]');

  function setStatus(message, type = '') {
    if (!status) return;
    status.textContent = message;
    status.className = `status-message ${type}`.trim();
  }

  async function loadStats() {
    const stats = await window.TrivialAPI.api('stats');
    byId('statUsers').textContent = stats.users;
    byId('statActive').textContent = stats.activeSubscriptions;
    byId('statKeys').textContent = stats.unusedKeys;
  }

  async function initialize() {
    try {
      const profile = await window.TrivialAPI.api('profile');
      const role = String(profile.user.role || '').toLowerCase();
      if (!['creator', 'admin'].includes(role)) {
        location.replace('/profile');
        return;
      }
      await loadStats();
    } catch (error) {
      setStatus(error.message, 'error');
      if (error.status === 401) location.replace('/signin?next=/admin-panel');
    }
  }

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const duration = Number(new FormData(form).get('duration'));
    if (!Number.isInteger(duration) || duration < 1 || duration > 3650) {
      setStatus('Выберите корректный срок ключа.', 'error');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Создаём…';
    copyButton.disabled = true;
    setStatus('Создаём ключ…');

    try {
      const data = await window.TrivialAPI.api('create-key', {
        method: 'POST',
        body: JSON.stringify({ duration })
      });
      generated.textContent = data.key;
      copyButton.disabled = false;
      setStatus(`Ключ на ${data.duration} дн. создан.`, 'success');
      await loadStats();
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Создать ключ';
    }
  });

  copyButton?.addEventListener('click', async () => {
    const key = generated.textContent.trim();
    if (!key.startsWith('TRIV-')) return;
    try {
      await navigator.clipboard.writeText(key);
      const original = copyButton.textContent;
      copyButton.textContent = 'Скопировано';
      setTimeout(() => { copyButton.textContent = original; }, 1200);
    } catch {
      setStatus('Не удалось скопировать ключ.', 'error');
    }
  });

  initialize();
})();
