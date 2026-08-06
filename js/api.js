(() => {
  const TOKEN_KEY = 'trivial_token';
  const USER_KEY = 'trivial_user';
  const USERNAME_KEY = 'trivial_username';

  const clearSession = () => {
    [TOKEN_KEY, USER_KEY, USERNAME_KEY, 'trivial_avatar', 'trivial_role', 'trivial_hwid'].forEach(key => localStorage.removeItem(key));
  };

  const api = async (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = options.signal ? null : new AbortController();
    const timeout = controller ? setTimeout(() => controller.abort(), Number(options.timeout || 20_000)) : null;

    let response;
    try {
      response = await fetch(`/api/${String(path).replace(/^\/+/, '')}`, {
        ...options,
        headers,
        signal: options.signal || controller?.signal,
        credentials: 'same-origin'
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Сервер не ответил вовремя. Повторите запрос.');
      throw new Error('Не удалось связаться с сервером. Проверьте интернет и настройки API.');
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); }
      catch { data = { success: false, message: text.slice(0, 300) }; }
    }

    if (response.status === 401 && token) clearSession();
    if (!response.ok || data?.success === false) {
      const error = new Error(data?.message || `Ошибка запроса (${response.status})`);
      error.status = response.status;
      error.code = data?.code;
      error.details = data;
      throw error;
    }
    return data;
  };

  window.TrivialAPI = {
    api,
    token: () => localStorage.getItem(TOKEN_KEY),
    user: () => {
      try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
      catch { return null; }
    },
    saveSession(data) {
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      if (data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        localStorage.setItem(USERNAME_KEY, data.user.username || '');
        localStorage.setItem('trivial_role', data.user.role || 'user');
        if (data.user.hwid) localStorage.setItem('trivial_hwid', data.user.hwid);
      }
    },
    clearSession,
    isSubscriptionActive(user) {
      if (!user) return false;
      if (typeof user.subscription_active === 'boolean') return user.subscription_active;
      const time = user.subscription ? new Date(user.subscription).getTime() : 0;
      return Number.isFinite(time) && time > Date.now();
    }
  };
})();
