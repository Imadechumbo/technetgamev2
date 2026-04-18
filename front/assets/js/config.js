(function () {
  const FALLBACKS = [
    'https://api.technetgame.com.br'
  ];

  function normalizeBase(value = '') {
    return String(value).trim().replace(/\/$/, '');
  }

  function unique(values = []) {
    return [...new Set(values.map(normalizeBase).filter(Boolean))];
  }

  function getCandidates() {
    const runtime = window.RUNTIME_CONFIG || {};
    const host = String(window.location?.hostname || '').toLowerCase();
    const isLocal = /localhost|127\.0\.0\.1/i.test(host);

    return unique([
      runtime.API_URL,
      runtime.API_BASE,
      ...(Array.isArray(runtime.API_FALLBACKS) ? runtime.API_FALLBACKS : []),
      ...FALLBACKS,
      isLocal ? 'http://127.0.0.1:8080' : ''
    ]);
  }

  function applyBase(base) {
    const resolvedBase = normalizeBase(base);
    window.RUNTIME_CONFIG = {
      ...(window.RUNTIME_CONFIG || {}),
      API_URL: resolvedBase,
      API_BASE: resolvedBase
    };
    window.__TNG_API_BASE__ = resolvedBase;
    return resolvedBase;
  }

  async function isHealthy(base) {
    if (!base) return false;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(`${base}/api/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  const candidates = getCandidates();
  applyBase(candidates[0] || '');

  window.__TNG_CONFIG_READY__ = (async () => {
    for (const candidate of candidates) {
      if (await isHealthy(candidate)) {
        return applyBase(candidate);
      }
    }
    return applyBase(candidates[0] || '');
  })();

  window.tngApiUrl = function (path = '') {
    const base = normalizeBase(window.__TNG_API_BASE__ || window.RUNTIME_CONFIG?.API_BASE || '');
    const raw = String(path || '').trim();
    if (!raw) return base;
    if (/^https?:\/\//i.test(raw)) return raw;
    const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
    return base ? `${base}${normalizedPath}` : normalizedPath;
  };
})();
