window.RUNTIME_CONFIG = {
  API_BASE_URL: "https://api.technetgame.com.br",
  API_URL: "https://api.technetgame.com.br",
  API_BASE: "https://api.technetgame.com.br",
  AI_API_BASE_URL: "https://api.technetgame.com.br",
  API_FALLBACKS: [
    "https://api.technetgame.com.br"
  ]
};

(function () {
  const normalizeBase = (value = '') => String(value || '').trim().replace(/\/$/, '');
  const base = normalizeBase(
    window.RUNTIME_CONFIG?.API_BASE_URL ||
    window.RUNTIME_CONFIG?.API_URL ||
    window.RUNTIME_CONFIG?.API_BASE ||
    'https://api.technetgame.com.br'
  );

  window.__TNG_API_BASE__ = base;
  window.__TNG_AI_API_BASE__ = normalizeBase(window.RUNTIME_CONFIG?.AI_API_BASE_URL || base);
  window.__TNG_CONFIG_READY__ = Promise.resolve(window.RUNTIME_CONFIG);

  window.tngApiUrl = function (path = '') {
    const raw = String(path || '').trim();
    if (!raw) return base;
    if (/^https?:\/\//i.test(raw)) return raw;
    const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
    return `${base}${normalizedPath}`;
  };

  const apiFetch = async function (url, options = {}) {
    const target = window.tngApiUrl(url);
    const headers = Object.assign({}, options.headers || {});
    if (options.body && !headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(target, { ...options, headers });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => ({}))
      : await response.text().catch(() => '');
    if (!response.ok) {
      const detail = data && typeof data === 'object'
        ? (data.error || data.details || data.message)
        : String(data || response.statusText || 'Falha');
      throw new Error(detail || `HTTP ${response.status}`);
    }
    return data;
  };

  window.api = apiFetch;
  window.api.get = function (path, options = {}) {
    return apiFetch(path, { ...options, method: 'GET' });
  };
  window.api.post = function (path, body, options = {}) {
    return apiFetch(path, { ...options, method: 'POST', body: typeof body === 'string' || body instanceof FormData ? body : JSON.stringify(body) });
  };
})();
