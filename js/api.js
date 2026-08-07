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
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const looksLikeHtml = contentType.includes('text/html') || /^\s*<!doctype\s+html/i.test(text) || /^\s*<html/i.test(text);
    let data = null;
    if (text) {
      if (looksLikeHtml) {
        data = {
          success: false,
          code: response.status === 404 ? 'API_ROUTE_NOT_FOUND' : 'API_INVALID_RESPONSE',
          message: response.status === 404
            ? 'API-метод не найден на сервере. Загрузите актуальную версию проекта и сделайте Redeploy в Vercel.'
            : `Сервер вернул HTML вместо JSON (HTTP ${response.status}). Проверьте маршрутизацию Vercel.`
        };
      } else {
        try { data = JSON.parse(text); }
        catch {
          const runtimeFailure = response.status >= 500 && /FUNCTION_(INVOCATION|THROTTLED)|server error|internal server error/i.test(text);
          data = {
            success: false,
            code: runtimeFailure ? 'API_RUNTIME_ERROR' : 'API_INVALID_RESPONSE',
            message: runtimeFailure
              ? `API-функция не запустилась (HTTP ${response.status}). Откройте Runtime Logs Vercel — это ошибка запуска серверного обработчика.`
              : `Некорректный ответ API (HTTP ${response.status}).`
          };
        }
      }
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
