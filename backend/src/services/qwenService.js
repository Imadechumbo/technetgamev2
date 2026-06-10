
const DEFAULT_TIMEOUT_MS = Number(process.env.HERMES_FALLBACK_TIMEOUT_MS || process.env.AI_REQUEST_TIMEOUT_MS || 6000);
const DEFAULT_MAX_TOKENS = Number(process.env.HERMES_MAX_TOKENS || 500);
const DEFAULT_TEMPERATURE = Number(process.env.HERMES_TEMPERATURE || 0.4);

function boolEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
}

function buildAbortSignal(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Hermes provider timeout')), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function normalizeProvider(provider = '') {
  const value = String(provider || '').trim().toLowerCase();
  if (['openrouter', 'groq', 'gemini'].includes(value)) return value;
  return '';
}

export function getHermesProviders() {
  const configuredOrder = String(process.env.HERMES_FALLBACK_ORDER || 'openrouter,groq,gemini')
    .split(',')
    .map((item) => normalizeProvider(item))
    .filter(Boolean);

  const preferred = [
    normalizeProvider(process.env.HERMES_PRIMARY_PROVIDER),
    normalizeProvider(process.env.HERMES_SECONDARY_PROVIDER),
    normalizeProvider(process.env.HERMES_TERTIARY_PROVIDER),
    ...configuredOrder
  ].filter(Boolean);

  const unique = [...new Set(preferred)];

  const registry = {
    openrouter: {
      provider: 'openrouter',
      enabled: boolEnv(process.env.HERMES_FALLBACK_ENABLED, true),
      apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || '',
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      model: process.env.HERMES_PRIMARY_MODEL || process.env.OPENROUTER_MODEL || 'qwen/qwen3.6-plus:free',
      headers: {
        'HTTP-Referer': process.env.SITE_URL || 'https://technetgame.com.br',
        'X-Title': `${process.env.SITE_NAME || 'TechNetGame'} Hermes`
      }
    },
    groq: {
      provider: 'groq',
      enabled: true,
      apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.GROQ_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1',
      model: process.env.HERMES_SECONDARY_MODEL || process.env.GROQ_MODEL || process.env.OPENAI_MODEL || process.env.AI_DEFAULT_MODEL || 'llama-3.3-70b-versatile',
      headers: {}
    },
    gemini: {
      provider: 'gemini',
      enabled: true,
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
      baseUrl: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: process.env.HERMES_TERTIARY_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      headers: {}
    }
  };

  return unique.map((name) => registry[name]).filter((item) => item && item.enabled);
}

export function isQwenConfigured() {
  return getHermesProviders().some((provider) => Boolean(provider.apiKey));
}

export function getHermesProviderStatus() {
  return getHermesProviders().map((provider) => ({
    provider: provider.provider,
    configured: Boolean(provider.apiKey),
    model: provider.model,
    baseUrl: provider.baseUrl
  }));
}

async function callOpenAIStyleProvider(providerConfig, messages, options = {}) {
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
  const { signal, clear } = buildAbortSignal(timeoutMs);
  try {
    const response = await fetch(`${providerConfig.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${providerConfig.apiKey}`,
        'Content-Type': 'application/json',
        ...(providerConfig.headers || {})
      },
      body: JSON.stringify({
        model: options.model || providerConfig.model,
        messages,
        temperature: typeof options.temperature === 'number' ? options.temperature : DEFAULT_TEMPERATURE,
        max_tokens: Number(options.max_tokens || DEFAULT_MAX_TOKENS)
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        provider: providerConfig.provider,
        model: options.model || providerConfig.model,
        content: '',
        error: `Falha ${providerConfig.provider} (${response.status}): ${text.slice(0, 280)}`,
        status: response.status
      };
    }

    const data = await response.json();
    return {
      ok: true,
      provider: providerConfig.provider,
      model: options.model || providerConfig.model,
      content: data?.choices?.[0]?.message?.content || '',
      raw: data
    };
  } catch (error) {
    return {
      ok: false,
      provider: providerConfig.provider,
      model: options.model || providerConfig.model,
      content: '',
      error: error?.message || String(error)
    };
  } finally {
    clear();
  }
}

export async function askQwen(prompt, options = {}) {
  const retries = Number(process.env.HERMES_RETRY_ATTEMPTS || 2);
  const providers = getHermesProviders();
  const messages = [
    {
      role: 'system',
      content:
        'Você é Hermes — Strategic Memory Admin do TechNetGame. Produza relatórios editoriais curtos, claros, confiáveis e com tom executivo em pt-BR.'
    },
    {
      role: 'user',
      content: String(prompt || '').trim()
    }
  ];

  const failures = [];

  for (const provider of providers) {
    if (!provider.apiKey) {
      failures.push({ provider: provider.provider, error: 'provider_not_configured' });
      continue;
    }

    let attempt = 0;
    while (attempt < retries) {
      attempt += 1;
      const result = await callOpenAIStyleProvider(provider, messages, options);
      if (result.ok && result.content) {
        return {
          ok: true,
          provider: result.provider,
          model: result.model,
          content: result.content,
          attempts: attempt,
          fallbackUsed: provider.provider !== providers[0]?.provider,
          failures
        };
      }
      failures.push({ provider: provider.provider, error: result.error, attempt });
      if (attempt >= retries) break;
    }
  }

  return {
    ok: false,
    provider: providers[0]?.provider || null,
    model: providers[0]?.model || null,
    content: '',
    error: failures.map((item) => `${item.provider}: ${item.error}`).join(' | ') || 'Nenhum provider Hermes configurado',
    failures
  };
}
