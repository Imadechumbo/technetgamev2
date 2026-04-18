import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve("data");
const STORE_FILE = path.join(DATA_DIR, "ai-memory-store.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function createEmptyState() {
  return {
    version: 1,
    users: {},
    sessions: {},
  };
}

let state = createEmptyState();

export function loadAiStore() {
  ensureDataDir();

  if (!fs.existsSync(STORE_FILE)) {
    state = createEmptyState();
    fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2));
    return state;
  }

  const raw = fs.readFileSync(STORE_FILE, "utf8");
  const parsed = safeJsonParse(raw, createEmptyState());

  state = {
    version: 1,
    users: normalizeObject(parsed.users),
    sessions: normalizeObject(parsed.sessions),
  };

  return state;
}

export function saveAiStore() {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2));
}

export function getAiStoreSnapshot() {
  return state;
}

export function getPersistedUser(token) {
  return state.users[token] || null;
}

export function setPersistedUser(token, userData) {
  state.users[token] = {
    ...(state.users[token] || {}),
    ...normalizeObject(userData),
  };
  saveAiStore();
  return state.users[token];
}

export function upsertPersistedSession(session) {
  if (!session?.id) return null;

  state.sessions[session.id] = {
    id: session.id,
    token: session.token,
    title: session.title || "Nova conversa",
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    messages: normalizeArray(session.messages),
    lastAgentSystem: session.lastAgentSystem || "default",
    summary: session.summary || "",
  };

  saveAiStore();
  return state.sessions[session.id];
}

export function removePersistedSession(sessionId) {
  if (!sessionId) return;
  delete state.sessions[sessionId];
  saveAiStore();
}

export function listPersistedSessionsForToken(token) {
  return Object.values(state.sessions)
    .filter((session) => session.token === token)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function clearPersistedMemoryForToken(token) {
  if (!token) return;

  if (state.users[token]) {
    state.users[token] = {
      ...state.users[token],
      learnedMemory: [],
      preferences: [],
      projects: [],
      constraints: [],
      profileSummary: "",
      lastLearnedAt: null,
      updatedAt: new Date().toISOString(),
    };
  }

  Object.values(state.sessions).forEach((session) => {
    if (session.token !== token) return;
    session.summary = "";
  });

  saveAiStore();
}
