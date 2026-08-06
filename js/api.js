(() => {
  const TOKEN_KEY = 'trivial_token';
  const USER_KEY = 'trivial_user';
  const USERNAME_KEY = 'trivial_username';

  const api = async (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(`/api/${String(path).replace(/^\/+/, '')}`, { ...options, headers });
    const type = response.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await response.json() : null;
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(USERNAME_KEY);
    }
    if (!response.ok || (data && data.success === false)) {
      const error = new Error(data?.message || `Ошибка запроса (${response.status})`);
      error.status = response.status;
      error.code = data?.code;
      throw error;
    }
    return data;
  };

  window.TrivialAPI = {
    api,
    token: () => localStorage.getItem(TOKEN_KEY),
    user: () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } },
    saveSession(data) {
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        localStorage.setItem(USERNAME_KEY, data.user.username || '');
      }
    },
    clearSession() {
      [TOKEN_KEY, USER_KEY, USERNAME_KEY, 'trivial_avatar', 'trivial_role', 'trivial_hwid'].forEach(key => localStorage.removeItem(key));
    },
    isSubscriptionActive(user) {
      if (!user) return false;
      if (typeof user.subscription_active === 'boolean') return user.subscription_active;
      const time = user.subscription ? new Date(user.subscription).getTime() : 0;
      return Number.isFinite(time) && time > Date.now();
    }
  };
})();
