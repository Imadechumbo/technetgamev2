import crypto from 'crypto';
import {
  clearPersistedMemoryForToken,
  getPersistedUser,
  listPersistedSessionsForToken,
  loadAiStore,
  removePersistedSession,
  saveAiStore,
  setPersistedUser,
  upsertPersistedSession,
} from './aiMemoryStore.js';
import { VISION_AGENTS, getVisionAgent } from '../config/visionAgents.js';

const demoUsers = new Map();
const sessions = new Map();
const sessionIndexByToken = new Map();
const attachmentStore = new Map();

const DEFAULT_REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 45000);

const GROQ_BASE_URL = process.env.GROQ_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '';
const GROQ_MODEL =
  process.env.GROQ_MODEL ||
  process.env.OPENAI_MODEL ||
  process.env.AI_DEFAULT_MODEL ||
  process.env.DEFAULT_CHAT_MODEL ||
  'llama-3.1-8b-instant';

const OPENCLAW_AGENTS = {
  technical: 'Analista Técnico',
  games: 'Especialista Games',
  market: 'Analista de Mercado',
  security: 'Especialista Segurança',
  ai: 'Analista IA',
  hardware: 'Especialista Hardware',
  auto: 'OpenClaw Auto Router'
};

const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || process.env.AI_FALLBACK_MODEL || 'openrouter/auto';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

const VISION_BASE_URL = process.env.VISION_BASE_URL || 'https://api.openai.com/v1';
const VISION_API_KEY = process.env.VISION_API_KEY || process.env.OPENAI_VISION_API_KEY || '';
const VISION_MODEL = process.env.VISION_MODEL || 'gpt-4o-mini';
const MAX_VISION_IMAGE_BYTES = Number(process.env.MAX_VISION_IMAGE_BYTES || 8 * 1024 * 1024);


const VISION_FALLBACK_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-3-27b-it:free',
  'google/gemma-3-12b-it:free',
  'google/gemma-3-4b-it:free',
];

const SITE_URL = process.env.SITE_URL || 'https://technetgame.com.br';
const SITE_NAME = process.env.SITE_NAME || 'TechNetGame';
const MAX_MEMORY_ITEMS = Number(process.env.TECHNET_MEMORY_MAX_ITEMS || 18);
const MAX_SESSION_MESSAGES = Number(process.env.TECHNET_MEMORY_MAX_SESSION_MESSAGES || 32);

const DEFAULT_MODELS = [
  { name: 'technet-auto', provider: 'auto' },
  { name: GROQ_MODEL, provider: 'groq' },
  { name: OPENROUTER_MODEL, provider: 'openrouter' },
  { name: GEMINI_MODEL, provider: 'gemini' },
  { name: DEEPSEEK_MODEL, provider: 'deepseek' },
];

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildTimeoutSignal(timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('AI request timeout')), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function ensureTokenIndex(token) {
  if (!sessionIndexByToken.has(token)) {
    sessionIndexByToken.set(token, new Set());
  }
  return sessionIndexByToken.get(token);
}

function limitList(items = [], max = MAX_MEMORY_ITEMS) {
  return items.slice(-max);
}

function dedupeMemoryItems(items = []) {
  const seen = new Set();
  const output = [];

  for (const item of items) {
    const text = normalizeText(item?.text || '');
    if (!text) continue;
    const key = `${item.category || 'memory'}::${text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({
      category: item.category || 'memory',
      text,
      createdAt: item.createdAt || nowIso(),
      confidence: item.confidence || 'medium',
      source: item.source || 'chat',
    });
  }

  return output;
}

function extractQuotedPreference(text) {
  const match = String(text || '').match(
    /(?:prefiro|gosto de|quero|evite|não quero|nao quero|sempre|nunca)\s+(.{3,120})/i
  );
  return match ? normalizeText(match[1].replace(/[.!?]+$/, '')) : '';
}

function learnFromMessage(message = '') {
  const text = normalizeText(message);
  const lower = text.toLowerCase();
  const learned = [];
  if (!text || text.length < 6) return learned;

  if (
    /(meu projeto|projeto|stack|backend|frontend|deploy|railway|cloudflare|node\.js|nodejs|api|dom[ií]nio)/i.test(
      text
    ) &&
    text.length <= 220
  ) {
    learned.push({ category: 'project', text, confidence: 'high' });
  }

  if (/(prefiro|gosto de|quero|eu quero|sempre|normalmente|deixe|mant[eê]m|mantenha)/i.test(lower)) {
    const pref = extractQuotedPreference(text) || text;
    learned.push({ category: 'preference', text: pref, confidence: 'medium' });
  }

  if (/(n[aã]o quero|evite|sem quebrar|n[aã]o mexa|n[aã]o bagunce|sem alterar|sem prejudicar)/i.test(lower)) {
    learned.push({ category: 'constraint', text, confidence: 'high' });
  }

  if (/(pr[oó]ximo passo|meta|objetivo|vamos|preciso|quero agora|foco)/i.test(lower) && text.length <= 180) {
    learned.push({ category: 'goal', text, confidence: 'medium' });
  }

  return dedupeMemoryItems(learned);
}

function summarizeSessionMessages(messages = []) {
  const recent = messages.slice(-6);
  const userMessages = recent
    .filter((msg) => msg.role === 'user')
    .map((msg) => normalizeText(msg.content))
    .filter(Boolean);
  const assistantMessages = recent
    .filter((msg) => msg.role === 'assistant')
    .map((msg) => normalizeText(msg.content))
    .filter(Boolean);

  const bullets = [];
  if (userMessages.length) {
    bullets.push(`Pedidos recentes: ${userMessages.slice(-3).join(' | ').slice(0, 500)}`);
  }
  if (assistantMessages.length) {
    bullets.push(`Últimas respostas: ${assistantMessages.slice(-2).join(' | ').slice(0, 500)}`);
  }
  return bullets.join('\n');
}

function hydrateRuntimeFromStore() {
  const store = loadAiStore();

  Object.values(store.users || {}).forEach((user) => {
    if (!user?.token || demoUsers.has(user.token)) return;
    demoUsers.set(user.token, {
      id: user.id || newId('user'),
      email: user.email || `restored_${Date.now()}@technetgame.local`,
      plan: user.plan || 'open',
      createdAt: user.createdAt || nowIso(),
      usedToday: Number(user.usedToday || 0),
      limit: Number(user.limit || 30),
      learnedMemory: Array.isArray(user.learnedMemory) ? user.learnedMemory : [],
      preferences: Array.isArray(user.preferences) ? user.preferences : [],
      projects: Array.isArray(user.projects) ? user.projects : [],
      constraints: Array.isArray(user.constraints) ? user.constraints : [],
      goals: Array.isArray(user.goals) ? user.goals : [],
      profileSummary: user.profileSummary || '',
      updatedAt: user.updatedAt || nowIso(),
      lastLearnedAt: user.lastLearnedAt || null,
      token: user.token,
    });
    ensureTokenIndex(user.token);
  });

  Object.values(store.sessions || {}).forEach((session) => {
    if (!session?.id || !session?.token) return;
    sessions.set(session.id, {
      id: session.id,
      token: session.token,
      title: session.title || 'Nova conversa',
      createdAt: session.createdAt || nowIso(),
      updatedAt: session.updatedAt || nowIso(),
      messages: Array.isArray(session.messages) ? session.messages : [],
      lastAgentSystem: session.lastAgentSystem || 'default',
      summary: session.summary || '',
    });
    ensureTokenIndex(session.token).add(session.id);
  });
}

hydrateRuntimeFromStore();

function persistUser(token) {
  const user = demoUsers.get(token);
  if (!user) return;
  setPersistedUser(token, { ...user, token });
}

function persistSession(session) {
  if (!session) return;
  upsertPersistedSession(session);
}

function buildProfileSummary(user) {
  const sections = [];
  if (user.projects?.length) sections.push(`Projetos: ${user.projects.slice(-4).join(' | ')}`);
  if (user.preferences?.length) sections.push(`Preferências: ${user.preferences.slice(-4).join(' | ')}`);
  if (user.constraints?.length) sections.push(`Restrições: ${user.constraints.slice(-4).join(' | ')}`);
  if (user.goals?.length) sections.push(`Objetivos: ${user.goals.slice(-4).join(' | ')}`);
  return sections.join('\n');
}

function mergeLearnedMemory(token, message) {
  const user = demoUsers.get(token);
  if (!user) return null;

  const learned = learnFromMessage(message);
  if (!learned.length) return user;

  user.learnedMemory = limitList(dedupeMemoryItems([...(user.learnedMemory || []), ...learned]));
  user.preferences = limitList(
    dedupeMemoryItems([
      ...((user.preferences || []).map((text) => ({ category: 'preference', text }))),
      ...learned.filter((item) => item.category === 'preference'),
    ]).map((item) => item.text),
    8
  );
  user.projects = limitList(
    dedupeMemoryItems([
      ...((user.projects || []).map((text) => ({ category: 'project', text }))),
      ...learned.filter((item) => item.category === 'project'),
    ]).map((item) => item.text),
    8
  );
  user.constraints = limitList(
    dedupeMemoryItems([
      ...((user.constraints || []).map((text) => ({ category: 'constraint', text }))),
      ...learned.filter((item) => item.category === 'constraint'),
    ]).map((item) => item.text),
    8
  );
  user.goals = limitList(
    dedupeMemoryItems([
      ...((user.goals || []).map((text) => ({ category: 'goal', text }))),
      ...learned.filter((item) => item.category === 'goal'),
    ]).map((item) => item.text),
    8
  );

  user.lastLearnedAt = nowIso();
  user.updatedAt = nowIso();
  user.profileSummary = buildProfileSummary(user);
  persistUser(token);
  return user;
}

function buildMemoryContext(token, session) {
  const user = demoUsers.get(token);
  if (!user) return '';

  const memoryLines = [];

  if (user.profileSummary) {
    memoryLines.push(`Perfil aprendido do usuário:\n${user.profileSummary}`);
  }

  if (Array.isArray(user.learnedMemory) && user.learnedMemory.length) {
    memoryLines.push(
      `Memória útil recente:\n- ${user.learnedMemory
        .slice(-6)
        .map((item) => item.text)
        .join('\n- ')}`
    );
  }

  if (session?.summary) {
    memoryLines.push(`Resumo da sessão atual:\n${session.summary}`);
  }

  return memoryLines.join('\n\n').trim();
}

function isImageLike(file = {}) {
  const mime = String(file.mimetype || file.mimeType || file.type || '').toLowerCase();
  return mime.startsWith('image/');
}

function imageBufferToDataUrl(file) {
  if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
    const error = new Error('Imagem inválida para análise visual');
    error.status = 400;
    throw error;
  }
  const mime = String(file.mimetype || file.mimeType || file.type || 'image/png').toLowerCase();
  return `data:${mime};base64,${file.buffer.toString('base64')}`;
}

export function listVisionAgents() {
  return Object.values(VISION_AGENTS).map((agent) => ({ key: agent.key, name: agent.name }));
}

async function callVisionProvider({ model, systemPrompt, message, imageFile, providerName = 'vision' }) {
  if (!VISION_API_KEY) {
    const error = new Error('VISION_API_KEY não configurada');
    error.status = 501;
    throw error;
  }

  if (!isImageLike(imageFile)) {
    const error = new Error('Envie um arquivo de imagem válido');
    error.status = 400;
    throw error;
  }

  if (Number(imageFile.size || 0) > MAX_VISION_IMAGE_BYTES) {
    const error = new Error('Imagem acima do limite permitido para análise visual');
    error.status = 413;
    throw error;
  }

  const { signal, clear } = buildTimeoutSignal();

  // Lista de modelos para tentar em ordem (fallback em caso de 429/503)
  const baseModel = model || VISION_MODEL || 'gpt-4o-mini';
  const candidateModels = [baseModel, ...VISION_FALLBACK_MODELS.filter(m => m !== baseModel)];
  
  let lastError = null;
  for (const candidateModel of candidateModels) {
    const usedModel = candidateModel;
  const mime = String(imageFile.mimetype || imageFile.mimeType || imageFile.type || 'image/png').toLowerCase();
  const base64Data = imageFile.buffer.toString('base64');

  // --- Detectar provider ---
  // 1. Explícito via env VISION_PROVIDER
  // 2. Auto-detectar pelo prefixo da key
  const envProvider = String(process.env.VISION_PROVIDER || 'auto').toLowerCase();
  let provider;
  if (envProvider === 'auto') {
    if (VISION_API_KEY.startsWith('sk-or-')) provider = 'openrouter';
    else if (VISION_API_KEY.startsWith('AIza')) provider = 'gemini';
    else if (VISION_API_KEY.startsWith('sk-')) provider = 'openai';
    else provider = 'openrouter'; // fallback seguro
  } else {
    provider = envProvider;
  }

  const userText = message || 'Analise este print detalhadamente.';
  const dataUrl = `data:${mime};base64,${base64Data}`;

  let url, headers, body, parseContent;

  if (provider === 'gemini') {
    // === GEMINI NATIVO ===
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(usedModel)}:generateContent?key=${encodeURIComponent(VISION_API_KEY)}`;
    headers = { 'Content-Type': 'application/json' };
    body = JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        role: 'user',
        parts: [
          { text: userText },
          { inline_data: { mime_type: mime, data: base64Data } },
        ],
      }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
    });
    parseContent = (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } else {
    // === OPENAI-COMPATIBLE (openrouter, openai, together, vllm, etc) ===
    const baseUrl = (VISION_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    url = `${baseUrl}/chat/completions`;
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VISION_API_KEY}`,
    };
    // OpenRouter exige HTTP-Referer e X-Title
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = SITE_URL || 'https://technetgame.com.br';
      headers['X-Title'] = 'TechNetGame Vision';
    }
    body = JSON.stringify({
      model: usedModel,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 900,
    });
    parseContent = (data) => data?.choices?.[0]?.message?.content?.trim() || null;
  }

  const response = await fetch(url, { method: 'POST', headers, signal, body });
  const data = await readJsonSafe(response);
  clear();

  if (!response.ok) {
    console.error('[vision]', provider, 'status:', response.status, 'data:', JSON.stringify(data));
    const error = new Error(
      data?.error?.message || data?.message || data?.raw || `Falha no provider visual (${provider})`
    );
    error.status = response.status;
    error.provider = providerName;
    error.vendor = provider;
    error.payload = data;
    // Se for rate limit ou unavailable, tenta próximo modelo
    if (response.status === 429 || response.status === 503) {
      console.warn('[vision] modelo', usedModel, 'indisponível (', response.status, '), tentando próximo...');
      lastError = error;
      clear();
      continue;
    }
    throw error;
  }

  const content = parseContent(data);
  if (!content) {
    const error = new Error(`Provider visual (${provider}) retornou resposta vazia`);
    error.status = 502;
    error.provider = providerName;
    error.vendor = provider;
    error.payload = data;
    throw error;
  }

  return { answer: content, provider: `${provider}-vision`, model: usedModel, raw: data };
  }
  // Se chegou aqui, todos os modelos falharam
  throw lastError || new Error('Todos os modelos vision falharam');
}

function fallbackVisionAnswer({ message = '', visionAgent = 'default', imageFile = null, error = null }) {
  const agent = getVisionAgent(visionAgent);
  const fileName = imageFile?.originalname || imageFile?.name || 'imagem';
  const lines = [
    `O agente visual **${agent.name}** recebeu o print **${fileName}**.`,
    `Pedido interpretado: ${message || 'Analise este print detalhadamente.'}`,
    'A rota visual está instalada, mas o provider multimodal falhou ou ainda não foi configurado.',
    'Configure VISION_API_KEY e, se necessário, VISION_BASE_URL / VISION_MODEL para ativar a leitura real de imagens em produção.',
  ];
  if (error?.message) {
    lines.push(`Detalhe técnico: ${error.message}`);
  }
  return lines.map((line) => `- ${line}`).join('\n');
}

export function listModels() {
  return DEFAULT_MODELS.map((m) => ({ ...m, label: m.name }));
}

export function createDemoAccess() {
  const token = `demo_${crypto.randomUUID().replace(/-/g, '')}`;
  const user = {
    id: newId('user'),
    email: `demo_${Date.now()}@technetgame.local`,
    plan: process.env.FORCE_PRO_FOR_ALL_TEST_USERS === 'true' ? 'pro' : 'open',
    createdAt: nowIso(),
    usedToday: 0,
    limit: 30,
    learnedMemory: [],
    preferences: [],
    projects: [],
    constraints: [],
    goals: [],
    profileSummary: '',
    updatedAt: nowIso(),
    lastLearnedAt: null,
    token,
  };

  demoUsers.set(token, user);
  ensureTokenIndex(token);
  persistUser(token);
  return { token, user };
}

export function requireUserFromToken(rawToken) {
  const token = String(rawToken || '').trim();

  if (!token) {
    const error = new Error('Token inválido ou expirado');
    error.status = 401;
    throw error;
  }

  if (!demoUsers.has(token)) {
    const restored = getPersistedUser(token);
    if (restored) {
      demoUsers.set(token, {
        id: restored.id || newId('user'),
        email: restored.email || `restored_${Date.now()}@technetgame.local`,
        plan: restored.plan || 'open',
        createdAt: restored.createdAt || nowIso(),
        usedToday: Number(restored.usedToday || 0),
        limit: Number(restored.limit || 30),
        learnedMemory: Array.isArray(restored.learnedMemory) ? restored.learnedMemory : [],
        preferences: Array.isArray(restored.preferences) ? restored.preferences : [],
        projects: Array.isArray(restored.projects) ? restored.projects : [],
        constraints: Array.isArray(restored.constraints) ? restored.constraints : [],
        goals: Array.isArray(restored.goals) ? restored.goals : [],
        profileSummary: restored.profileSummary || '',
        updatedAt: restored.updatedAt || nowIso(),
        lastLearnedAt: restored.lastLearnedAt || null,
        token,
      });
      ensureTokenIndex(token);
      listPersistedSessionsForToken(token).forEach((session) => {
        sessions.set(session.id, {
          ...session,
          messages: Array.isArray(session.messages) ? session.messages : [],
        });
        ensureTokenIndex(token).add(session.id);
      });
    }
  }

  if (!demoUsers.has(token)) {
    const error = new Error('Token inválido ou expirado');
    error.status = 401;
    throw error;
  }

  return { token, user: demoUsers.get(token) };
}

export function getUsageForToken(token) {
  const { user } = requireUserFromToken(token);
  return {
    user: { id: user.id, email: user.email, plan: user.plan },
    usage: {
      usedToday: user.usedToday,
      limit: user.limit,
      effectivePlan: user.plan,
    },
  };
}

export function getMemoryForToken(token) {
  const { user } = requireUserFromToken(token);
  const relatedSessions = listSessionsForToken(token);
  return {
    profileSummary: user.profileSummary || '',
    learnedMemory: (user.learnedMemory || []).slice(-12),
    preferences: user.preferences || [],
    projects: user.projects || [],
    constraints: user.constraints || [],
    goals: user.goals || [],
    lastLearnedAt: user.lastLearnedAt || null,
    sessionCount: relatedSessions.length,
  };
}

export function clearMemoryForToken(token) {
  const { user } = requireUserFromToken(token);
  user.learnedMemory = [];
  user.preferences = [];
  user.projects = [];
  user.constraints = [];
  user.goals = [];
  user.profileSummary = '';
  user.lastLearnedAt = nowIso();
  user.updatedAt = nowIso();
  clearPersistedMemoryForToken(token);
  persistUser(token);
  return { ok: true };
}

export function incrementUsage(token) {
  const auth = requireUserFromToken(token);
  auth.user.usedToday += 1;
  auth.user.updatedAt = nowIso();
  persistUser(token);
}

export function listSessionsForToken(token) {
  requireUserFromToken(token);
  const ids = [...(sessionIndexByToken.get(token) || new Set())];

  return ids
    .map((id) => sessions.get(id))
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((session) => ({
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      messageCount: session.messages.length,
      summary: session.summary || '',
      lastAgentSystem: session.lastAgentSystem || 'default',
    }));
}

export function getSessionById(token, id) {
  requireUserFromToken(token);
  const session = sessions.get(id);

  if (!session || session.token !== token) {
    const error = new Error('Sessão não encontrada');
    error.status = 404;
    throw error;
  }

  return session;
}

export function deleteSessionById(token, id) {
  const session = getSessionById(token, id);
  sessions.delete(id);
  sessionIndexByToken.get(token)?.delete(id);
  removePersistedSession(session.id);
  saveAiStore();
  return { ok: true, id: session.id };
}

function guessAttachmentCategory(file) {
  const mime = String(file.mimetype || file.type || '').toLowerCase();

  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('word') || mime.includes('document')) return 'doc';
  if (mime.includes('image')) return 'imagem';
  if (mime.includes('zip')) return 'zip';
  if (mime.includes('json') || mime.includes('javascript') || mime.includes('text')) {
    return 'texto';
  }

  return 'arquivo';
}

function extractZipPreview(buffer) {
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const textExts = /\.(js|ts|jsx|tsx|json|md|txt|html|css|py|java|env|yaml|yml|sh|xml|csv)$/i;
    let preview = '';
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      preview += `\n\n=== ${entry.entryName} ===\n`;
      if (textExts.test(entry.entryName)) {
        const content = entry.getData().toString('utf8', 0, 3000);
        preview += content;
      } else {
        preview += '[arquivo binário]';
      }
      if (preview.length > 12000) break;
    }
    return preview.trim().slice(0, 12000);
  } catch (e) {
    return '[erro ao ler ZIP: ' + e.message + ']';
  }
}

export async function createAttachmentRecords(files = []) {
  const records = [];
  for (const file of files) {
    const id = newId('upload');
    const mime = String(file.mimetype || file.type || '').toLowerCase();
    const isZip = mime.includes('zip') || String(file.originalname || file.name || '').endsWith('.zip');

    let textPreview = '';
    if (file.buffer) {
      if (isZip) {
        // ZIP: extrai conteúdo dos arquivos de texto internos
        try {
          const { default: AdmZip } = await import('adm-zip');
          const zip = new AdmZip(file.buffer);
          const entries = zip.getEntries();
          const textExts = /\.(js|ts|jsx|tsx|json|md|txt|html|css|py|java|env|yaml|yml|sh|xml|csv)$/i;
          let zipContent = `[ZIP com ${entries.length} arquivo(s)]\n`;
          for (const entry of entries) {
            if (entry.isDirectory) continue;
            zipContent += `\n=== ${entry.entryName} ===\n`;
            if (textExts.test(entry.entryName)) {
              zipContent += entry.getData().toString('utf8', 0, 3000);
            } else {
              zipContent += '[binário]';
            }
            if (zipContent.length > 12000) break;
          }
          textPreview = zipContent.slice(0, 12000);
        } catch (e) {
          textPreview = '[erro ao processar ZIP: ' + e.message + ']';
        }
      } else {
        textPreview = file.buffer.toString('utf8', 0, Math.min(file.buffer.length, 2000));
      }
    } else {
      textPreview = file.textPreview || '';
    }

    const record = {
      id,
      fieldName: file.fieldname,
      originalName: file.originalname || file.name || 'file',
      name: file.originalname || file.name || 'file',
      mimeType: mime || 'application/octet-stream',
      size: file.size || 0,
      category: guessAttachmentCategory(file),
      uploadedAt: nowIso(),
      textPreview,
    };

    attachmentStore.set(id, record);
    records.push(record);
  }
  return records;
}

function deriveTitle(message) {
  return String(message || 'Nova conversa').trim().slice(0, 60) || 'Nova conversa';
}

function chooseAgentSystem(message = '') {
  const text = String(message).toLowerCase();

  if (/código|code|bug|erro|patch|api|backend|frontend|javascript|node|deploy/.test(text)) {
    return 'coder';
  }
  if (/pesquisa|rss|fonte|fontes|buscar|news|notícia|osint|investigar/.test(text)) {
    return 'research';
  }
  if (/plano|estratégia|roadmap|arquitetura|checklist|passos|organizar/.test(text)) {
    return 'planner';
  }

  return 'default';
}

function buildSystemPrompt(agentSystem, attachments = [], memoryContext = '') {
  const base =
    'Você é o TechNet AI, um assistente em português do Brasil, útil, objetivo e profissional.';

  const byAgent = {
    planner:
      'Atue como estrategista e organizador. Entregue planos claros, por etapas e com prioridade.',
    coder:
      'Atue como engenheiro de software sênior. Foque em correções práticas, patches e diagnóstico técnico.',
    research:
      'Atue como analista de pesquisa e OSINT. Resuma fontes, contexto e próximos passos.',
    default:
      'Atue como assistente geral da TechNet, com respostas úteis, diretas e orientadas à ação.',
  };

  const attachmentHint = attachments.length
    ? `Considere também estes anexos: ${attachments
        .map((a) => `${a.originalName || a.name} (${a.category || 'arquivo'})`)
        .join(', ')}.`
    : '';

  const memoryHint = memoryContext
    ? `Use esta memória persistente para personalizar a resposta sem inventar fatos:\n${memoryContext}`
    : '';

  return [base, byAgent[agentSystem] || byAgent.default, attachmentHint, memoryHint]
    .filter(Boolean)
    .join(' ');
}

function isRetryableProviderError(status, message = '') {
  const msg = String(message || '').toLowerCase();

  return (
    status === 408 ||
    status === 409 ||
    status === 425 ||
    status === 429 ||
    status >= 500 ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('capacity') ||
    msg.includes('overloaded') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('timed out') ||
    msg.includes('billing') ||
    msg.includes('credit')
  );
}

async function readJsonSafe(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function callOpenAICompatible({
  apiKey,
  baseUrl,
  model,
  systemPrompt,
  message,
  attachments,
  providerName,
  extraHeaders = {},
}) {
  if (!apiKey) {
    const error = new Error(`${providerName}: missing API key`);
    error.status = 401;
    throw error;
  }

  const attachmentText = attachments.length
    ? `\n\nResumo dos anexos:\n${attachments
        .map((a) => `- ${a.originalName || a.name}: ${a.textPreview || 'sem prévia'}`)
        .join('\n')}`
    : '';

  const { signal, clear } = buildTimeoutSignal();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    signal,
    body: JSON.stringify({
      model,
      temperature: 0.5,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${message}${attachmentText}` },
      ],
      stream: false,
    }),
  });

  const data = await readJsonSafe(response);
  clear();

  if (!response.ok) {
    const error = new Error(
      data?.error?.message ||
        data?.message ||
        data?.raw ||
        `Falha no provedor ${providerName}`
    );
    error.status = response.status;
    error.provider = providerName;
    error.payload = data;
    throw error;
  }

  const content =
    data?.choices?.[0]?.message?.content?.trim() ||
    data?.choices?.[0]?.text?.trim() ||
    null;

  if (!content) {
    const error = new Error(`${providerName}: empty response`);
    error.status = 502;
    error.provider = providerName;
    error.payload = data;
    throw error;
  }

  return { answer: content, provider: providerName, model, raw: data };
}

async function callGemini({ model, systemPrompt, message, attachments = [] }) {
  if (!GEMINI_API_KEY) {
    const error = new Error('gemini: missing API key');
    error.status = 401;
    throw error;
  }

  const attachmentText = attachments.length
    ? `\n\nResumo dos anexos:\n${attachments
        .map((a) => `- ${a.originalName || a.name}: ${a.textPreview || 'sem prévia'}`)
        .join('\n')}`
    : '';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const { signal, clear } = buildTimeoutSignal();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: `${systemPrompt}

${message}${attachmentText}` }] }],
      generationConfig: { temperature: 0.5 },
    }),
  });

  const data = await readJsonSafe(response);
  clear();

  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.message || data?.raw || 'Falha no provedor gemini');
    error.status = response.status;
    error.provider = 'gemini';
    error.payload = data;
    throw error;
  }

  const content = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim() || null;
  if (!content) {
    const error = new Error('gemini: empty response');
    error.status = 502;
    error.provider = 'gemini';
    error.payload = data;
    throw error;
  }

  return { answer: content, provider: 'gemini', model: model || GEMINI_MODEL, raw: data };
}

async function generateWithFallback({
  selectedModel,
  systemPrompt,
  message,
  attachments,
}) {
  const modelRef = String(selectedModel || 'technet-auto').trim();
  const providerHint = modelRef.includes(':') ? modelRef.split(':', 1)[0].toLowerCase() : (DEFAULT_MODELS.find((item) => item.name === modelRef)?.provider || 'auto');
  const cleanModel = modelRef.includes(':') ? modelRef.split(':', 2)[1].trim() : modelRef;

  const orderedProviders = providerHint === 'auto'
    ? ['groq', 'openrouter', 'gemini', 'deepseek']
    : [providerHint, ...['groq', 'openrouter', 'gemini', 'deepseek'].filter((item) => item !== providerHint)];

  const providerModels = {
    groq: cleanModel && providerHint === 'groq' ? cleanModel : GROQ_MODEL,
    openrouter: cleanModel && providerHint === 'openrouter' ? cleanModel : OPENROUTER_MODEL,
    gemini: cleanModel && providerHint === 'gemini' ? cleanModel : GEMINI_MODEL,
    deepseek: cleanModel && providerHint === 'deepseek' ? cleanModel : DEEPSEEK_MODEL,
  };

  const errors = [];

  for (const provider of orderedProviders) {
    try {
      if (provider === 'groq') {
        return await callOpenAICompatible({ apiKey: GROQ_API_KEY, baseUrl: GROQ_BASE_URL, model: providerModels.groq, systemPrompt, message, attachments, providerName: 'groq' });
      }
      if (provider === 'openrouter') {
        return await callOpenAICompatible({ apiKey: OPENROUTER_API_KEY, baseUrl: OPENROUTER_BASE_URL, model: providerModels.openrouter, systemPrompt, message, attachments, providerName: 'openrouter', extraHeaders: { 'HTTP-Referer': SITE_URL, 'X-Title': SITE_NAME } });
      }
      if (provider === 'gemini') {
        return await callGemini({ model: providerModels.gemini, systemPrompt, message, attachments });
      }
      if (provider === 'deepseek') {
        return await callOpenAICompatible({ apiKey: DEEPSEEK_API_KEY, baseUrl: DEEPSEEK_BASE_URL, model: providerModels.deepseek, systemPrompt, message, attachments, providerName: 'deepseek' });
      }
    } catch (error) {
      errors.push({ provider, status: error.status || 500, message: error.message });
      if (providerHint !== 'auto' && !isRetryableProviderError(error.status || 500, error.message)) {
        break;
      }
    }
  }

  const finalError = new Error('Todos os providers falharam');
  finalError.status = 503;
  finalError.providers = errors;
  throw finalError;
}

function fallbackAnswer({
  message,
  agentSystem = 'default',
  attachments = [],
  providerErrors = [],
}) {
  const intro =
    {
      planner: 'Montei um plano objetivo para você seguir agora.',
      coder: 'Preparei um diagnóstico técnico direto ao ponto.',
      research: 'Organizei uma análise rápida do contexto pedido.',
      default: 'Separei uma resposta clara e prática para o seu pedido.',
    }[agentSystem] || 'Preparei uma resposta útil para o seu pedido.';

  const bullets = [
    `Pedido recebido: ${message}`,
    'Se quiser mais precisão, anexe arquivos ou peça um checklist operacional.',
    'O modo de fallback local entrou em ação porque os provedores de IA externos ficaram indisponíveis.',
  ];

  if (attachments.length) {
    bullets.push(
      `Anexos detectados: ${attachments.map((a) => a.originalName || a.name).join(', ')}.`
    );
  }

  if (providerErrors.length) {
    bullets.push(
      `Falhas dos providers: ${providerErrors
        .map((item) => `${item.provider} (${item.status}): ${item.message}`)
        .join(' | ')}`
    );
  }

  return `${intro}\n\n- ${bullets.join('\n- ')}`;
}

function createSession(token, seedMessage = '') {
  const id = newId('session');
  const session = {
    id,
    token,
    title: deriveTitle(seedMessage),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    messages: [],
    summary: '',
    lastAgentSystem: 'default',
  };

  sessions.set(id, session);
  ensureTokenIndex(token).add(id);
  persistSession(session);
  return session;
}

export async function generateAssistantAnswer({
  token,
  message,
  sessionId,
  model,
  attachments = [],
}) {
  let resolvedToken = token;
  if (!resolvedToken) {
    const access = createDemoAccess();
    resolvedToken = access.token;
  }

  incrementUsage(resolvedToken);
  mergeLearnedMemory(resolvedToken, message);

  const agentSystem = chooseAgentSystem(message);
  let session = null;
  if (sessionId) {
    try {
      session = getSessionById(resolvedToken, sessionId);
    } catch (_error) {
      session = createSession(resolvedToken, message);
    }
  } else {
    session = createSession(resolvedToken, message);
  }

  const attachmentRecords = attachments
    .map((item) => attachmentStore.get(item.id) || item)
    .filter(Boolean);

  session.messages.push({
    id: newId('msg'),
    role: 'user',
    content: message,
    createdAt: nowIso(),
    attachments: attachmentRecords,
  });
  session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
  session.updatedAt = nowIso();
  session.lastAgentSystem = agentSystem;
  session.summary = summarizeSessionMessages(session.messages);
  persistSession(session);

  const selectedModel = model || GROQ_MODEL;
  const memoryContext = buildMemoryContext(resolvedToken, session);
  const systemPrompt = buildSystemPrompt(agentSystem, attachmentRecords, memoryContext);

  let answer = null;
  let usedProvider = 'local-fallback';
  let usedModel = selectedModel;

  try {
    const completion = await generateWithFallback({
      selectedModel,
      systemPrompt,
      message,
      attachments: attachmentRecords,
    });
    answer = completion.answer;
    usedProvider = completion.provider;
    usedModel = completion.model;
  } catch (error) {
    answer = fallbackAnswer({
      message,
      agentSystem,
      attachments: attachmentRecords,
      providerErrors:
        error.providers || [
          {
            provider: 'unknown',
            status: error.status || 500,
            message: error.message,
          },
        ],
    });
  }

  if (!answer) {
    answer = fallbackAnswer({
      message,
      agentSystem,
      attachments: attachmentRecords,
    });
  }

  session.messages.push({
    id: newId('msg'),
    role: 'assistant',
    content: answer,
    createdAt: nowIso(),
    agentSystem,
    model: usedModel,
    provider: usedProvider,
  });
  session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
  session.updatedAt = nowIso();
  session.lastAgentSystem = agentSystem;
  session.summary = summarizeSessionMessages(session.messages);
  persistSession(session);

  const memory = getMemoryForToken(resolvedToken);

  return {
    session,
    sessionId: session.id,
    resposta: answer,
    answer,
    agentSystem,
    model: usedModel,
    provider: usedProvider,
    memory,
    token: resolvedToken,
  };
}



export async function generateVisionAnswer({
  token,
  message,
  sessionId,
  model,
  visionAgent = 'default',
  imageFile = null,
  attachments = [],
}) {
  let resolvedToken = token;
  if (!resolvedToken) {
    const access = createDemoAccess();
    resolvedToken = access.token;
  }
  incrementUsage(resolvedToken);
  if (message) {
    mergeLearnedMemory(resolvedToken, message);
  }

  const agent = getVisionAgent(visionAgent);
  let session = null;
  if (sessionId) {
    try {
      session = getSessionById(resolvedToken, sessionId);
    } catch (_error) {
      session = createSession(resolvedToken, message || `Análise visual — ${agent.name}`);
    }
  } else {
    session = createSession(resolvedToken, message || `Análise visual — ${agent.name}`);
  }

  const attachmentRecords = attachments
    .filter((item) => item && typeof item === 'object')
    .slice(0, 6)
    .map((item) => ({
      id: item.id || newId('upload'),
      originalName: String(item.originalName || item.name || 'arquivo'),
      name: String(item.name || item.originalName || 'arquivo'),
      category: String(item.category || 'arquivo'),
      textPreview: String(item.textPreview || '').slice(0, 1200),
      mimeType: String(item.mimeType || 'application/octet-stream'),
      size: Number(item.size || 0),
    }));
  const userMessage = message || 'Analise este print detalhadamente.';
  const fileName = imageFile?.originalname || imageFile?.name || 'imagem';
  const memoryContext = buildMemoryContext(resolvedToken, session);
  const attachmentHint = attachmentRecords.length
    ? `Anexos de suporte fornecidos: ${attachmentRecords
        .map((item) => `${item.originalName} (${item.category})`)
        .join(', ')}.`
    : '';
  const systemPrompt = [agent.prompt, memoryContext ? `Memória útil do usuário:\n${memoryContext}` : '']
    .concat(attachmentHint ? [attachmentHint] : [])
    .filter(Boolean)
    .join('\n\n');
  const attachmentText = attachmentRecords.length
    ? `\n\nContexto adicional em anexos:\n${attachmentRecords
        .map((item) => `- ${item.originalName}: ${item.textPreview || 'sem prévia disponível'}`)
        .join('\n')}`
    : '';
  const visionMessage = `${userMessage}${attachmentText}`;

  session.messages.push({
    id: newId('msg'),
    role: 'user',
    content: `${visionMessage} [imagem: ${fileName}]`,
    createdAt: nowIso(),
    visionAgent: agent.key,
    image: imageFile
      ? {
          name: fileName,
          mimeType: imageFile.mimetype || imageFile.mimeType || 'image/png',
          size: Number(imageFile.size || imageFile.buffer?.length || 0),
        }
      : null,
  });
  session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
  session.updatedAt = nowIso();
  session.lastAgentSystem = agent.key;
  session.summary = summarizeSessionMessages(session.messages);
  persistSession(session);

  let answer = null;
  let usedProvider = 'vision-fallback';
  let usedModel = model || VISION_MODEL;

  try {
    const completion = await callVisionProvider({
      model: model || VISION_MODEL,
      systemPrompt,
      message: visionMessage,
      imageFile,
      providerName: 'vision',
    });
    answer = completion.answer;
    usedProvider = completion.provider;
    usedModel = completion.model;
  } catch (error) {
    answer = fallbackVisionAnswer({
      message: visionMessage,
      visionAgent: agent.key,
      imageFile,
      error,
    });
  }

  session.messages.push({
    id: newId('msg'),
    role: 'assistant',
    content: answer,
    createdAt: nowIso(),
    agentSystem: agent.key,
    model: usedModel,
    provider: usedProvider,
    mode: 'vision',
  });
  session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
  session.updatedAt = nowIso();
  session.lastAgentSystem = agent.key;
  session.summary = summarizeSessionMessages(session.messages);
  persistSession(session);

  const memory = getMemoryForToken(resolvedToken);

  return {
    session,
    sessionId: session.id,
    resposta: answer,
    answer,
    agentSystem: agent.key,
    visionAgent: agent.key,
    visionAgentName: agent.name,
    model: usedModel,
    provider: usedProvider,
    memory,
    token: resolvedToken,
  };
}
export function splitIntoTokenChunks(text) {
  const normalized = String(text || '');
  const chunks = [];

  for (let i = 0; i < normalized.length; i += 12) {
    chunks.push(normalized.slice(i, i + 12));
  }

  return chunks;
}

export function getOpenClawState() {
  const availableProviders = [
    ['groq', Boolean(GROQ_API_KEY)],
    ['openrouter', Boolean(OPENROUTER_API_KEY)],
    ['gemini', Boolean(GEMINI_API_KEY)],
    ['deepseek', Boolean(DEEPSEEK_API_KEY)],
    ['vision', Boolean(VISION_API_KEY)],
  ].filter(([, enabled]) => enabled).map(([name]) => name);

  const primaryProvider = availableProviders[0] || 'groq';
  const fallbackProvider = availableProviders.find((name) => name !== primaryProvider) || primaryProvider;

  const agentRouting = {
    planner: primaryProvider,
    coder: primaryProvider,
    research: availableProviders.includes('openrouter') ? 'openrouter' : fallbackProvider,
    default: primaryProvider,
    bug: availableProviders.includes('vision') ? 'vision' : fallbackProvider,
    ui: availableProviders.includes('vision') ? 'vision' : fallbackProvider,
    hardware: availableProviders.includes('deepseek') ? 'deepseek' : fallbackProvider,
    osint: availableProviders.includes('gemini') ? 'gemini' : fallbackProvider,
  };
  const agentModels = Object.fromEntries(Object.entries(agentRouting).map(([key, provider]) => [key, {
    provider,
    model: provider === 'openrouter' ? OPENROUTER_MODEL : provider === 'gemini' ? GEMINI_MODEL : provider === 'deepseek' ? DEEPSEEK_MODEL : provider === 'vision' ? VISION_MODEL : GROQ_MODEL,
  }]));
  return {
    enabled: process.env.OPENCLAW_ENABLED !== 'false',
    provider: `${primaryProvider}-multi-fallback`,
    providers: availableProviders,
    defaultModel: GROQ_MODEL,
    fallbackModel: OPENROUTER_MODEL,
    geminiModel: GEMINI_MODEL,
    deepseekModel: DEEPSEEK_MODEL,
    visionModel: VISION_MODEL,
    publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN || null,
    agentRouting,
    agentModels,
  };
}
