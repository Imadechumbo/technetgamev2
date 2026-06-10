document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const nav = document.querySelector('.main-nav');
  const searchToggle = document.querySelector('[data-search-toggle]');
  const searchBox = document.querySelector('.search-inline');
  const header = document.querySelector('.site-header');
  const yearEls = document.querySelectorAll('[data-current-year]');

  const currentPath = (window.location.pathname || '').replace(/\/+$/, '') || '/';
  const normalizedPath = currentPath === '' ? '/' : currentPath;
  const isTechNetAIPage = normalizedPath === '/technet-ai' || normalizedPath === '/technet-ai.html' || normalizedPath.startsWith('/technet-ai/');

  const AGENTS = {
    tech: {
      name: 'Analista Técnico',
      slug: 'analista-tecnico',
      label: 'Tecnologia',
      desc: 'Monitora software, plataformas, arquitetura e infraestrutura do ecossistema tech.',
      short: 'Tecnologia, software, plataformas e arquitetura.',
      page: '/tecnologia'
    },
    games: {
      name: 'Especialista Games',
      slug: 'especialista-games',
      label: 'Jogos',
      desc: 'Rastreia lançamentos, desempenho, comunidade e tendências do universo gamer.',
      short: 'Games, UX, performance e comunidade.',
      page: '/games'
    },
    market: {
      name: 'Analista de Mercado',
      slug: 'analista-mercado',
      label: 'Empresas',
      desc: 'Lê mercado, negócios, ROI e movimentos estratégicos das empresas de tecnologia.',
      short: 'Mercado, negócios, ROI e movimentos estratégicos.',
      page: '/empresas'
    },
    security: {
      name: 'Especialista Segurança',
      slug: 'especialista-seguranca',
      label: 'Segurança',
      desc: 'Vigia riscos, vulnerabilidades, incidentes e sinais de ameaça em segurança digital.',
      short: 'Riscos, vulnerabilidades e proteção.',
      page: '/seguranca'
    },
    ai: {
      name: 'Analista IA',
      slug: 'analista-ia',
      label: 'IA & Dados',
      desc: 'Interpreta IA, dados, automação e integrações que mudam o fluxo editorial.',
      short: 'IA, dados, automação e integração multimodal.',
      page: '/ia-dados'
    },
    hardware: {
      name: 'Especialista Hardware',
      slug: 'especialista-hardware',
      label: 'Hardware',
      desc: 'Avalia chips, placas, notebooks e compatibilidade do hardware em tempo real.',
      short: 'Especificações, refrigeração e compatibilidade.',
      page: '/hardware'
    }
  };

  const HERMES_AGENT = { name: "Hermes — Strategic Memory Admin", image: "/assets/img/hermes-strategic-memory-admin.png" };

  const AGENT_PRESENTATION_COPY = {
    ai: {
      eyebrow: 'IA viva',
      title: 'Olá, eu sou a Analista IA.',
      message: 'Leio sinais, padrões e automações para transformar ruído em direção clara.'
    },
    games: {
      eyebrow: 'Radar gamer',
      title: 'Eu sou o Especialista Games.',
      message: 'Caço tendências, sensação da comunidade e performance antes do hype explodir.'
    },
    hardware: {
      eyebrow: 'Silício extremo',
      title: 'Sou o Especialista Hardware.',
      message: 'Comparo chips, refrigeração e compatibilidade para extrair performance real.'
    },
    security: {
      eyebrow: 'Escudo ativo',
      title: 'Sou o Especialista Segurança.',
      message: 'Vigio riscos, anomalias e vulnerabilidades para manter o ecossistema protegido.'
    },
    market: {
      eyebrow: 'Visão estratégica',
      title: 'Eu sou o Analista de Mercado.',
      message: 'Cruzo sinais de ROI, empresas e movimentos táticos para achar oportunidades.'
    },
    tech: {
      eyebrow: 'Arquitetura premium',
      title: 'Sou o Analista Técnico.',
      message: 'Mapeio software, plataformas e infraestrutura para sustentar decisões melhores.'
    }
  };


  const categoryAgentMap = {
    '/tecnologia': 'tech',
    '/games': 'games',
    '/empresas': 'market',
    '/sony': 'games',
    '/nintendo': 'games',
    '/microsoft': 'games',
    '/valve': 'games',
    '/valve-pre-estreias': 'games',
    '/steam-news': 'games',
    '/steamdb': 'games',
    '/steam-charts': 'games',
    '/apple': 'tech',
    '/google': 'tech',
    '/hardware': 'hardware',
    '/ia-dados': 'ai',
    '/seguranca': 'security',
    '/mes': 'market'
  };

  const agentMotionMap = {
    tech: 'analytical',
    games: 'energetic',
    market: 'strategic',
    security: 'watchful',
    ai: 'neural',
    hardware: 'precision'
  };

  const agentBehaviorMap = {
    tech: { idle: 'thinking', hover: 'hover' },
    games: { idle: 'hover', hover: 'alert' },
    market: { idle: 'success', hover: 'hover' },
    security: { idle: 'alert', hover: 'error' },
    ai: { idle: 'thinking', hover: 'hover' },
    hardware: { idle: 'success', hover: 'alert' }
  };


  const homeHoverBehaviorMap = {
    tech: 'thinking',
    games: 'alert',
    market: 'success',
    security: 'error',
    ai: 'hover',
    hardware: 'alert'
  };

  const AGENT_SPRITE_MANIFEST = {
    frame: { width: 560, height: 560, cols: 6, rows: 4, fps: 7 },
    agents: {
      tech: { sheet: '/assets/agents-v3/sprites/tecnico_spritesheet_v3_ultra_realista.png', fallback: '/assets/img/openclaw-agents/analista-tecnico.png' },
      games: { sheet: '/assets/agents-v3/sprites/gamer_spritesheet_v3_ultra_realista.png', fallback: '/assets/img/openclaw-agents/especialista-games.png' },
      market: { sheet: '/assets/agents-v3/sprites/mercado_spritesheet_v3_ultra_realista.png', fallback: '/assets/img/openclaw-agents/analista-mercado.png' },
      security: { sheet: '/assets/agents-v3/sprites/seguranca_spritesheet_v3_ultra_realista.png', fallback: '/assets/img/openclaw-agents/especialista-seguranca.png' },
      ai: { sheet: '/assets/agents-v3/sprites/ia_spritesheet_v3_ultra_realista.png', fallback: '/assets/img/openclaw-agents/analista-ia.png' },
      hardware: { sheet: '/assets/agents-v3/sprites/hardware_spritesheet_v3_ultra_realista.png', fallback: '/assets/img/openclaw-agents/especialista-hardware.png' }
    },
    states: {
      idle: { row: 0, frames: [0,1,2,3,4,5], fps: 6, effect: 'idle' },
      thinking: { row: 1, frames: [0,1,2,3,4,5], fps: 8, effect: 'thinking' },
      success: { row: 2, frames: [0,1,2,3,4,5], fps: 7, effect: 'success' },
      error: { row: 3, frames: [0,1,2,3,4,5], fps: 7, effect: 'error' },
      alert: { row: 1, frames: [1,2,3,4], fps: 10, effect: 'alert' },
      hover: { row: 2, frames: [2,3,4,5], fps: 9, effect: 'hover' }
    },
    intelligence: {
      version: 'v6-inteligente',
      preload: true,
      backendHealth: '/api/health',
      localEvents: ['technet:feed-grid-loading', 'technet:feed-grid-rendered', 'technet:feed-grid-error'],
      scoring: {
        alertKeywords: ['falha', 'ataque', 'exploit', 'breach', 'vulnerabilidade', 'vazamento', 'cve', 'critical', 'risco', 'queda', 'demissao', 'layoff', 'processo'],
        successKeywords: ['lançamento', 'launch', 'recorde', 'sucesso', 'cresce', 'ganha', 'melhora', 'update', 'patch', 'benchmark', 'disponível', 'anuncia'],
        thinkingKeywords: ['rumor', 'preview', 'beta', 'teste', 'analise', 'analysis', 'guia', 'roadmap', 'investiga', 'planeja']
      }
    }
  };

  const agentIntelligenceMemory = new Map();
  const defaultAgentStateMap = {
    tech: 'thinking',
    games: 'hover',
    market: 'success',
    security: 'alert',
    ai: 'thinking',
    hardware: 'success'
  };

  const preloadAgentSprites = () => {
    Object.values(AGENT_SPRITE_MANIFEST.agents).forEach((entry) => {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = entry.sheet;
    });
  };

  const getSpriteConfig = (key, state = 'idle') => {
    const agent = AGENT_SPRITE_MANIFEST.agents[key] || AGENT_SPRITE_MANIFEST.agents.tech;
    const spriteState = AGENT_SPRITE_MANIFEST.states[state] || AGENT_SPRITE_MANIFEST.states.idle;
    return { agent, spriteState };
  };

  const createSpriteMarkup = (key, state = 'idle', alt = 'Agent') => {
    const { agent, spriteState } = getSpriteConfig(key, state);
    const frameCount = Array.isArray(spriteState.frames) ? spriteState.frames.length : AGENT_SPRITE_MANIFEST.frame.cols;
    const startCol = Array.isArray(spriteState.frames) ? spriteState.frames[0] : 0;
    const endCol = Array.isArray(spriteState.frames) ? spriteState.frames[spriteState.frames.length - 1] : (AGENT_SPRITE_MANIFEST.frame.cols - 1);
    return `
      <span class="agent-sprite is-preloaded" aria-hidden="true"
        data-agent-sprite="${key}"
        data-agent-state="${state}"
        data-agent-effect="${spriteState.effect || state}"
        style="--sprite-sheet:url('${agent.sheet}');--sprite-fallback:url('${agent.fallback}');--sprite-row:${spriteState.row};--sprite-start-col:${startCol};--sprite-end-col:${endCol};--sprite-frames:${frameCount};--sprite-fps:${spriteState.fps || AGENT_SPRITE_MANIFEST.frame.fps};--sprite-frame-w:${AGENT_SPRITE_MANIFEST.frame.width}px;--sprite-frame-h:${AGENT_SPRITE_MANIFEST.frame.height}px;--sprite-sheet-w:${AGENT_SPRITE_MANIFEST.frame.width * AGENT_SPRITE_MANIFEST.frame.cols}px;--sprite-sheet-h:${AGENT_SPRITE_MANIFEST.frame.height * AGENT_SPRITE_MANIFEST.frame.rows}px;">
        <span class="agent-sprite__sheet"></span>
        <span class="sr-only">${alt}</span>
      </span>`;
  };

  const setSpriteState = (host, key, state) => {
    if (!host) return;
    const sprite = host.querySelector('.agent-sprite');
    if (!sprite) return;
    const { spriteState } = getSpriteConfig(key, state);
    const frameCount = Array.isArray(spriteState.frames) ? spriteState.frames.length : AGENT_SPRITE_MANIFEST.frame.cols;
    const startCol = Array.isArray(spriteState.frames) ? spriteState.frames[0] : 0;
    const endCol = Array.isArray(spriteState.frames) ? spriteState.frames[spriteState.frames.length - 1] : (AGENT_SPRITE_MANIFEST.frame.cols - 1);
    host.setAttribute('data-agent-state', state);
    sprite.setAttribute('data-agent-state', state);
    sprite.setAttribute('data-agent-effect', spriteState.effect || state);
    sprite.style.setProperty('--sprite-row', String(spriteState.row));
    sprite.style.setProperty('--sprite-start-col', String(startCol));
    sprite.style.setProperty('--sprite-end-col', String(endCol));
    sprite.style.setProperty('--sprite-frames', String(frameCount));
    sprite.style.setProperty('--sprite-fps', String(spriteState.fps || AGENT_SPRITE_MANIFEST.frame.fps));
  };

  const applyAgentState = (key, state, reason = 'local', ttl = 0) => {
    if (!key) return;
    const expiresAt = ttl > 0 ? Date.now() + ttl : 0;
    agentIntelligenceMemory.set(key, { state, reason, expiresAt });
    document.querySelectorAll(`[data-agent-card="${key}"], [data-page-agent="${key}"]`).forEach((node) => {
      node.dataset.agentReason = reason;
      setSpriteState(node, key, state);
      if (state === 'thinking' || state === 'alert' || state === 'success') {
        node.classList.add('is-working');
        window.setTimeout(() => node.classList.remove('is-working'), Math.min(ttl || 1600, 2600));
      }
    });
  };

  const cleanupAgentMemory = () => {
    const now = Date.now();
    agentIntelligenceMemory.forEach((value, key) => {
      if (value.expiresAt && value.expiresAt <= now) {
        agentIntelligenceMemory.delete(key);
        applyAgentState(key, defaultAgentStateMap[key] || 'idle', 'cooldown');
      }
    });
  };

  const wireSpriteStates = (scope = document) => {
    scope.querySelectorAll('[data-agent-card], [data-page-agent]').forEach((node) => {
      if (node.dataset.spriteBound === 'true') return;
      node.dataset.spriteBound = 'true';
      const key = node.getAttribute('data-agent-card') || node.getAttribute('data-page-agent') || 'tech';
      const baseState = node.getAttribute('data-agent-state') || 'idle';
      setSpriteState(node, key, baseState);
      node.addEventListener('mouseenter', () => setSpriteState(node, key, 'hover'));
      node.addEventListener('mouseleave', () => setSpriteState(node, key, node.dataset.agentState || baseState));
      node.addEventListener('focusin', () => setSpriteState(node, key, 'hover'));
      node.addEventListener('focusout', () => setSpriteState(node, key, node.dataset.agentState || baseState));
      node.addEventListener('click', () => {
        applyAgentState(key, 'thinking', 'interaction', 1200);
        window.setTimeout(() => applyAgentState(key, 'success', 'interaction-success', 1600), 500);
      });
    });
  };

  const scoreTextAgainstKeywords = (text, words = []) => {
    const haystack = String(text || '').toLowerCase();
    return words.reduce((acc, word) => acc + (haystack.includes(word) ? 1 : 0), 0);
  };

  const getAgentKeyFromApi = (api = '', label = '') => {
    const value = `${api} ${label}`.toLowerCase();
    if (value.includes('security') || value.includes('seguran')) return 'security';
    if (value.includes('hardware')) return 'hardware';
    if (value.includes('games') || value.includes('sony') || value.includes('nintendo') || value.includes('microsoft') || value.includes('valve') || value.includes('steam')) return 'games';
    if (value.includes('technology') || value.includes('google') || value.includes('apple') || value.includes('tecnologia')) return 'tech';
    if (value.includes('ai') || value.includes('ia-dados') || value.includes('dados')) return 'ai';
    if (value.includes('empresas') || value.includes('market') || value.includes('mes')) return 'market';
    return null;
  };

  const analyzeItemsMood = (items = [], agentKey = '') => {
    const scoring = AGENT_SPRITE_MANIFEST.intelligence.scoring;
    const joined = items.slice(0, 8).map((item) => `${item?.title || ''} ${item?.summary || ''} ${item?.category || ''}`).join(' | ').toLowerCase();
    const alertHits = scoreTextAgainstKeywords(joined, scoring.alertKeywords);
    const successHits = scoreTextAgainstKeywords(joined, scoring.successKeywords);
    const thinkingHits = scoreTextAgainstKeywords(joined, scoring.thinkingKeywords);

    const recentHits = items.slice(0, 6).reduce((acc, item) => {
      const date = item?.publishedAt ? new Date(item.publishedAt).getTime() : 0;
      if (!date) return acc;
      return acc + ((Date.now() - date) < 1000 * 60 * 60 * 36 ? 1 : 0);
    }, 0);

    if (agentKey === 'security' && (alertHits >= 1 || recentHits >= 3)) return 'alert';
    if (alertHits >= 2) return 'alert';
    if (successHits >= 2 || (items.length >= 6 && recentHits >= 4)) return 'success';
    if (thinkingHits >= 1 || items.length >= 1) return 'thinking';
    return 'idle';
  };

  const syncAgentsFromBackend = async () => {
    const apiBase = window.RUNTIME_CONFIG?.API_BASE_URL || window.RUNTIME_CONFIG?.API_URL || window.__TNG_API_BASE__ || '';
    if (!apiBase) return;
    try {
      const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/health`, { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const health = await response.json();
      const refreshing = Boolean(health?.refresh?.isRefreshing);
      const cacheAgeSec = Number(health?.cacheAgeSec || 0);
      const translationFailures = Number(health?.translation?.failedRecent || 0);
      const categories = health?.categories || {};
      const map = {
        tech: refreshing ? 'thinking' : (cacheAgeSec > 7200 ? 'alert' : 'idle'),
        games: Number(categories.games || 0) > 10 ? 'success' : 'thinking',
        market: Number(categories.microsoft || 0) + Number(categories.sony || 0) > 10 ? 'success' : 'thinking',
        security: translationFailures > 0 ? 'alert' : (Number(categories.security || 0) > 0 ? 'thinking' : 'idle'),
        ai: Number(categories.ai || 0) > 8 ? 'success' : 'thinking',
        hardware: Number(categories.hardware || 0) > 4 ? 'success' : 'thinking'
      };
      Object.entries(map).forEach(([key, state]) => applyAgentState(key, state, 'backend-health', 0));
    } catch (error) {
      console.warn('Agent backend state sync skipped:', error);
    }
  };

  const buildHermesRanking = async () => {
    const host = document.querySelector('[data-agent-ranking]');
    if (!host || host.dataset.enhancedMeetingRoom === 'true' || normalizedPath === '/relatorios' || normalizedPath === '/relatorios.html' || normalizedPath.startsWith('/relatorios/')) return;
    const baseScores = {
      tech: 84,
      games: 82,
      market: 85,
      security: 81,
      ai: 88,
      hardware: 86
    };
    const apiBase = window.RUNTIME_CONFIG?.API_BASE_URL || window.RUNTIME_CONFIG?.API_URL || window.__TNG_API_BASE__ || '';
    if (apiBase) {
      try {
        const response = await fetch(`${apiBase.replace(/\/$/, '')}/api/health`, { headers: { Accept: 'application/json' } });
        if (response.ok) {
          const health = await response.json();
          const categories = health?.categories || {};
          baseScores.tech += Number(categories.technology || 0) * 0.5;
          baseScores.games += Number(categories.games || 0) * 0.6;
          baseScores.market += (Number(categories.microsoft || 0) + Number(categories.sony || 0)) * 0.35;
          baseScores.security += Number(categories.security || 0) * 1.2;
          baseScores.ai += Number(categories.ai || 0) * 0.7;
          baseScores.hardware += Number(categories.hardware || 0) * 0.9;
        }
      } catch (error) {
        console.warn('Hermes ranking fallback active:', error);
      }
    }
    const ranking = Object.entries(baseScores)
      .sort((a, b) => b[1] - a[1])
      .map(([key, score], index) => ({
        key,
        score: Math.round(score),
        rank: index + 1,
        agent: AGENTS[key]
      }));

    const orbitLayout = {
      ai: 'top-left',
      games: 'top-right',
      hardware: 'right-mid',
      market: 'left-mid',
      tech: 'bottom-left',
      security: 'bottom-right'
    };

    host.innerHTML = `
      <div class="hermes-ranking-free" data-free-ranking>
        <div class="hermes-ranking-free__intro">
          <span class="hermes-ranking-free__eyebrow">Apresentação viva dos agentes</span>
          <h3>Os agentes agora ficam livres no espaço do Hermes</h3>
          <p>Passe o mouse sobre cada agente para ver seu papel, nível atual e contribuição no ecossistema TechNetGame sem cards pesados nem balões cortados.</p>
        </div>
        <div class="hermes-ranking-free__stage" aria-label="Arena livre dos agentes do Hermes">
          <div class="hermes-ranking-free__core" aria-hidden="true"></div>
          ${ranking.map((entry) => {
            const bubble = AGENT_PRESENTATION_COPY[entry.key] || {
              eyebrow: 'Agente ativo',
              title: `Olá, eu sou ${entry.agent.name}.`,
              message: entry.agent.short
            };
            return `
            <article class="hermes-free-agent" data-rank-key="${entry.key}" data-free-pos="${orbitLayout[entry.key] || 'top-left'}" tabindex="0">
              <button class="hermes-free-agent__button" type="button" aria-label="${entry.agent.name}: ${entry.agent.label}">
                <span class="hermes-free-agent__score">#${entry.rank} • ${entry.score}/100</span>
                <span class="hermes-free-agent__avatar-wrap">
                  <img src="${AGENT_SPRITE_MANIFEST.agents[entry.key].fallback}" alt="${entry.agent.name}" class="hermes-free-agent__avatar">
                </span>
                <span class="hermes-free-agent__name">${entry.agent.name}</span>
                <span class="hermes-free-agent__label">${entry.agent.label}</span>
              </button>
              <div class="hermes-free-agent__panel">
                <span class="hermes-free-agent__panel-kicker">${bubble.eyebrow}</span>
                <strong class="hermes-free-agent__panel-title">${bubble.title}</strong>
                <p class="hermes-free-agent__panel-text">${bubble.message}</p>
                <small class="hermes-free-agent__panel-meta">${entry.agent.desc}</small>
              </div>
            </article>`;
          }).join('')}
        </div>
      </div>`;
  };


  const initAgentSpeechBubbles = (scope = document) => {
    const cards = Array.from(scope.querySelectorAll('.hermes-rank-card[data-rank-key]'));
    if (!cards.length) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    cards.forEach((card) => {
      if (card.dataset.bubbleReady === 'true') return;
      card.dataset.bubbleReady = 'true';
      const textNode = card.querySelector('[data-bubble-text]');
      if (!textNode) return;
      const fullText = textNode.getAttribute('data-bubble-text') || textNode.textContent || '';
      const typeBubble = () => {
        if (window.innerWidth <= 980) return;
        if (textNode.dataset.typing === 'true') return;
        textNode.dataset.typing = 'true';
        if (prefersReducedMotion) {
          textNode.textContent = fullText;
          textNode.dataset.typing = 'false';
          return;
        }
        textNode.textContent = '';
        let index = 0;
        const tick = () => {
          if (!card.matches(':hover,:focus-within')) {
            textNode.dataset.typing = 'false';
            return;
          }
          textNode.textContent = fullText.slice(0, index + 1);
          index += 1;
          if (index < fullText.length) {
            window.setTimeout(tick, index < 18 ? 18 : 14);
          } else {
            textNode.dataset.typing = 'false';
          }
        };
        tick();
      };
      const resetBubble = () => {
        textNode.textContent = fullText;
        textNode.dataset.typing = 'false';
      };
      card.addEventListener('mouseenter', typeBubble);
      card.addEventListener('focusin', typeBubble);
      card.addEventListener('mouseleave', resetBubble);
      card.addEventListener('focusout', resetBubble);
    });
  };

  const ensureReportsNav = () => {
    const navList = document.querySelector('.main-nav > ul');
    if (!navList) return;
    const monthItem = Array.from(navList.querySelectorAll('a[href="mes.html"], a[href="/mes"]')).find(Boolean);
    const existing = Array.from(navList.querySelectorAll('a')).find((link) => /relatorios\.html|\/relatorios/.test(link.getAttribute('href') || ''));
    if (existing) return;
    const li = document.createElement('li');
    li.innerHTML = '<a class="nav-link" href="/relatorios.html">Relatórios</a>';
    if (monthItem?.closest('li')?.nextSibling) {
      monthItem.closest('li').parentNode.insertBefore(li, monthItem.closest('li').nextSibling);
    } else {
      navList.appendChild(li);
    }
  };

  const ensureTechNetAINav = () => {
    const navList = document.querySelector('.main-nav > ul');
    if (!navList || isTechNetAIPage) return;
    const matches = Array.from(navList.querySelectorAll('a[href*="technet-ai"]'));
    if (matches.length) {
      const keeper = matches[0];
      keeper.classList.add('technet-ai-nav-link');
      keeper.setAttribute('data-technet-ai-nav', 'true');
      keeper.setAttribute('href', '/technet-ai');
      matches.slice(1).forEach((extra) => extra.closest('li')?.remove());
      return;
    }
    const li = document.createElement('li');
    li.className = 'technet-ai-nav-item';
    li.innerHTML = '<a class="nav-link technet-ai-nav-link" data-technet-ai-nav href="/technet-ai">TechNet AI</a>';
    navList.appendChild(li);
  };


  const injectHomeAgentsShowcase = () => {
    document.querySelectorAll('[data-openclaw-home-showcase]').forEach((node) => node.remove());
  };

  const getAgentsShortcutHref = () => {
    return window.matchMedia('(max-width: 768px)').matches ? 'agentes-technet.html' : 'relatorios.html';
  };

  const syncAgentsShortcutHref = (anchor) => {
    if (!anchor) return;
    anchor.setAttribute('href', getAgentsShortcutHref());
  };

  const bindAgentsShortcutRoute = (anchor) => {
    if (!anchor || anchor.dataset.agentsRouteBound === 'true') return;
    anchor.dataset.agentsRouteBound = 'true';
    syncAgentsShortcutHref(anchor);
    anchor.addEventListener('click', (event) => {
      const targetHref = getAgentsShortcutHref();
      event.preventDefault();
      anchor.setAttribute('href', targetHref);
      window.location.href = targetHref;
    });
  };

  const ensureHomeReportsShortcut = () => {
    if (!(normalizedPath === '/' || normalizedPath === '/index.html')) return;
    const ctaRow = document.querySelector('.hero-cta-row');
    if (!ctaRow) return;
    const targetHref = getAgentsShortcutHref();
    const existingShortcut = ctaRow.querySelector('.btn-agents-shortcut');
    if (existingShortcut) {
      existingShortcut.setAttribute('href', targetHref);
      existingShortcut.setAttribute('data-agents-route-ready', 'true');
      bindAgentsShortcutRoute(existingShortcut);
      return;
    }
    const anchor = document.createElement('a');
    anchor.className = 'btn btn-ghost btn-agents-shortcut';
    anchor.href = targetHref;
    anchor.textContent = 'Conheça nossos agentes TechNet';
    anchor.setAttribute('data-agents-route-ready', 'true');
    bindAgentsShortcutRoute(anchor);
    ctaRow.appendChild(anchor);
  };


  const syncHomeAgentsShortcutRoute = () => {
    const shortcut = document.querySelector('.hero-cta-row .btn-agents-shortcut, #cta-agentes-technet');
    if (!shortcut) return;
    syncAgentsShortcutHref(shortcut);
  };

  window.addEventListener('resize', syncHomeAgentsShortcutRoute, { passive: true });
  window.addEventListener('orientationchange', syncHomeAgentsShortcutRoute, { passive: true });

  const ensureCompactHeroStructure = (pageHeroBox) => {
    if (!pageHeroBox) return null;
    let content = pageHeroBox.querySelector('.page-hero-box__content');
    if (!content) {
      content = document.createElement('div');
      content.className = 'page-hero-box__content';
      const nodes = Array.from(pageHeroBox.childNodes).filter((node) => {
        if (node.nodeType === Node.TEXT_NODE) return String(node.textContent || '').trim() !== '';
        return !(node.nodeType === Node.ELEMENT_NODE && (node.classList.contains('page-agent-card') || node.hasAttribute('data-page-agent')));
      });
      nodes.forEach((node) => content.appendChild(node));
      pageHeroBox.prepend(content);
    }
    return content;
  };

  const injectPageHeroAgent = () => {
    if (normalizedPath === '/' || normalizedPath === '/index.html' || isTechNetAIPage) return;
    const pageHeroBox = document.querySelector('.page-hero-box');
    if (!pageHeroBox) return;

    if (pageHeroBox.querySelector('.month-hero-agent, .hermes-report-hero-cluster, .hermes-morph-card, .hermes-mini-stage')) {
      pageHeroBox.querySelectorAll('.page-agent-card, [data-page-agent], .hermes-page-card').forEach((node) => node.remove());
      return;
    }

    pageHeroBox.querySelectorAll('.page-agent-card, [data-page-agent]').forEach((node) => node.remove());
    const content = ensureCompactHeroStructure(pageHeroBox);

    const mappedKey = Object.keys(categoryAgentMap).find((key) => normalizedPath === key || normalizedPath.startsWith(`${key}.html`) || normalizedPath.startsWith(`${key}/`));
    const selectedKey = mappedKey ? categoryAgentMap[mappedKey] : 'tech';
    const agent = AGENTS[selectedKey];
    if (!agent) return;

    pageHeroBox.classList.add('page-hero-box--agent');
    if (normalizedPath.includes('/mes') || normalizedPath.includes('/games')) {
      pageHeroBox.classList.add('page-hero-box--compact');
    }

    const behavior = agentBehaviorMap[selectedKey] || {};
    const state = behavior.idle || defaultAgentStateMap[selectedKey] || 'idle';
    const motion = agentMotionMap[selectedKey] || 'analytical';

    const card = document.createElement('aside');
    if (normalizedPath.includes('/mes')) {
      card.className = 'hermes-page-card is-living';
      card.setAttribute('data-hermes-float', 'true');
      card.setAttribute('aria-label', HERMES_AGENT.name);
      card.setAttribute('title', HERMES_AGENT.name);
      card.innerHTML = `
        <div class="hermes-page-card__orb" aria-hidden="true">
          <img src="${HERMES_AGENT.image}" alt="${HERMES_AGENT.name}">
        </div>`;
      pageHeroBox.appendChild(card);
      return;
    }

    card.className = 'page-agent-card is-living';
    card.setAttribute('data-page-agent', selectedKey);
    card.setAttribute('data-agent-trigger', 'true');
    card.setAttribute('data-agent-state', state);
    card.setAttribute('data-agent-motion', motion);
    card.setAttribute('data-agent-hover-state', behavior.hover || 'hover');
    card.setAttribute('aria-label', `${agent.name} ativo nesta editoria`);
    card.setAttribute('title', agent.name);
    card.innerHTML = `
      <div class="page-agent-card__orb" aria-hidden="true">
        <span class="agent-energy agent-energy--outer"></span>
        <span class="agent-energy agent-energy--inner"></span>
        <span class="agent-status-light"></span>
        ${createSpriteMarkup(selectedKey, state, agent.name)}
      </div>`;
    pageHeroBox.appendChild(card);
  };

  const updateStatusText = (key, state, reason = '') => {
    const labels = {
      idle: 'Pronto',
      thinking: 'Analisando',
      success: 'Confirmado',
      error: 'Falha',
      alert: 'Alerta',
      hover: 'Em foco'
    };
    document.querySelectorAll(`[data-agent-card="${key}"]`).forEach((node) => {
      const tag = node.querySelector('[data-agent-status-text]');
      if (tag) tag.textContent = reason ? `${labels[state] || state} · ${reason}` : (labels[state] || state);
    });
  };


  const triggerHomeClusterWake = (activeNode, isLeaving = false) => {
    if (!activeNode) return;
    const cluster = activeNode.closest('[data-home-agent-cluster]');
    if (!cluster) return;
    const siblings = Array.from(cluster.querySelectorAll('[data-home-agent="true"]'));
    siblings.forEach((item, index) => {
      if (item === activeNode) {
        item.classList.toggle('is-cluster-anchor', !isLeaving);
        if (isLeaving) {
          item.style.removeProperty('--cluster-jitter-x');
          item.style.removeProperty('--cluster-jitter-y');
          item.style.removeProperty('--cluster-rotate');
          item.style.removeProperty('--cluster-delay');
        }
        return;
      }
      if (isLeaving) {
        item.classList.remove('is-cluster-awake');
        item.style.removeProperty('--cluster-jitter-x');
        item.style.removeProperty('--cluster-jitter-y');
        item.style.removeProperty('--cluster-rotate');
        item.style.removeProperty('--cluster-delay');
        return;
      }
      const direction = index % 2 === 0 ? 1 : -1;
      item.classList.add('is-cluster-awake');
      item.style.setProperty('--cluster-jitter-x', `${(4 + (index % 3) * 2) * direction}px`);
      item.style.setProperty('--cluster-jitter-y', `${(-3 - (index % 2))}px`);
      item.style.setProperty('--cluster-rotate', `${(2 + (index % 3)) * direction}deg`);
      item.style.setProperty('--cluster-delay', `${(index * 0.06).toFixed(2)}s`);
    });
  };

  const triggerAgentWork = (key, duration = 1800) => {
    if (!key) return;
    applyAgentState(key, 'thinking', 'navegação', Math.max(duration - 300, 900));
    window.setTimeout(() => applyAgentState(key, 'success', 'navegação', 1400), 500);
  };

  const attachLivingMotion = (node) => {
    if (!node || node.dataset.livingBound === 'true') return;
    node.dataset.livingBound = 'true';
    const key = node.getAttribute('data-page-agent') || node.getAttribute('data-agent-card') || 'tech';
    const hoverState = node.getAttribute('data-agent-hover-state') || (agentBehaviorMap[key] && agentBehaviorMap[key].hover) || 'hover';
    const baseState = node.getAttribute('data-agent-state') || defaultAgentStateMap[key] || 'idle';
    const isHomeAgent = node.matches('[data-home-agent="true"]');
    const hoverTarget = isHomeAgent ? (node.querySelector('.agent-card__media') || node) : node;
    const motionStrength = isHomeAgent
      ? { tiltX: 13, tiltY: 16, shiftX: 16, shiftY: 14, orbX: 12, orbY: 10, glowX: 18, glowY: 14 }
      : { tiltX: 9, tiltY: 11, shiftX: 10, shiftY: 8, orbX: 0, orbY: 0, glowX: 0, glowY: 0 };
    const tracker = {
      active: false,
      raf: 0,
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0,
      currentGlowX: 50,
      currentGlowY: 35,
      targetGlowX: 50,
      targetGlowY: 35,
      currentOrbX: 0,
      currentOrbY: 0,
      targetOrbX: 0,
      targetOrbY: 0
    };

    const renderTracker = () => {
      const ease = tracker.active ? 0.2 : 0.12;
      tracker.currentX += (tracker.targetX - tracker.currentX) * ease;
      tracker.currentY += (tracker.targetY - tracker.currentY) * ease;
      tracker.currentGlowX += (tracker.targetGlowX - tracker.currentGlowX) * ease;
      tracker.currentGlowY += (tracker.targetGlowY - tracker.currentGlowY) * ease;
      tracker.currentOrbX += (tracker.targetOrbX - tracker.currentOrbX) * ease;
      tracker.currentOrbY += (tracker.targetOrbY - tracker.currentOrbY) * ease;

      node.style.setProperty('--agent-tilt-x', `${tracker.currentY.toFixed(2)}deg`);
      node.style.setProperty('--agent-tilt-y', `${tracker.currentX.toFixed(2)}deg`);
      node.style.setProperty('--agent-shift-x', `${(tracker.currentX * (motionStrength.shiftX / Math.max(motionStrength.tiltY, 1))).toFixed(1)}px`);
      node.style.setProperty('--agent-shift-y', `${(-tracker.currentY * (motionStrength.shiftY / Math.max(motionStrength.tiltX, 1))).toFixed(1)}px`);
      node.style.setProperty('--agent-glow-x', `${tracker.currentGlowX.toFixed(1)}%`);
      node.style.setProperty('--agent-glow-y', `${tracker.currentGlowY.toFixed(1)}%`);
      if (isHomeAgent) {
        node.style.setProperty('--agent-orb-x', `${tracker.currentOrbX.toFixed(1)}px`);
        node.style.setProperty('--agent-orb-y', `${tracker.currentOrbY.toFixed(1)}px`);
      }

      const stillMoving = Math.abs(tracker.currentX - tracker.targetX) > 0.02
        || Math.abs(tracker.currentY - tracker.targetY) > 0.02
        || Math.abs(tracker.currentGlowX - tracker.targetGlowX) > 0.08
        || Math.abs(tracker.currentGlowY - tracker.targetGlowY) > 0.08
        || Math.abs(tracker.currentOrbX - tracker.targetOrbX) > 0.05
        || Math.abs(tracker.currentOrbY - tracker.targetOrbY) > 0.05;

      if (tracker.active || stillMoving) {
        tracker.raf = window.requestAnimationFrame(renderTracker);
      } else {
        tracker.raf = 0;
      }
    };

    const kickTracker = () => {
      if (tracker.raf) return;
      tracker.raf = window.requestAnimationFrame(renderTracker);
    };

    const updateFromEvent = (event) => {
      const rect = hoverTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const px = ((event.clientX - rect.left) / rect.width) - 0.5;
      const py = ((event.clientY - rect.top) / rect.height) - 0.5;
      tracker.targetX = px * motionStrength.tiltY;
      tracker.targetY = -py * motionStrength.tiltX;
      tracker.targetGlowX = 50 + (px * motionStrength.glowX);
      tracker.targetGlowY = 38 + (py * motionStrength.glowY);
      tracker.targetOrbX = px * motionStrength.orbX;
      tracker.targetOrbY = py * motionStrength.orbY * -1;
      kickTracker();
    };

    hoverTarget.addEventListener('mousemove', updateFromEvent, { passive: true });
    hoverTarget.addEventListener('mouseenter', (event) => {
      tracker.active = true;
      node.classList.add('is-hovered');
      if (isHomeAgent) { node.classList.add('is-tracking'); triggerHomeClusterWake(node, false); }
      setSpriteState(node, key, hoverState);
      updateFromEvent(event);
    });
    hoverTarget.addEventListener('mouseleave', () => {
      tracker.active = false;
      tracker.targetX = 0;
      tracker.targetY = 0;
      tracker.targetGlowX = 50;
      tracker.targetGlowY = 35;
      tracker.targetOrbX = 0;
      tracker.targetOrbY = 0;
      node.classList.remove('is-hovered');
      node.classList.remove('is-tracking');
      if (isHomeAgent) triggerHomeClusterWake(node, true);
      setSpriteState(node, key, baseState);
      kickTracker();
    });
  };

  const bindAgentInteractions = () => {
    document.querySelectorAll('[data-agent-trigger]').forEach((node) => {
      attachLivingMotion(node);
    });

    document.querySelectorAll('.main-nav a, .dropdown a').forEach((link) => {
      if (link.dataset.agentMenuBound === 'true') return;
      link.dataset.agentMenuBound = 'true';
      link.addEventListener('click', () => {
        const href = (link.getAttribute('href') || '').toLowerCase();
        let key = null;
        if (href.includes('tecnologia')) key = 'tech';
        else if (href.includes('games') || href.includes('sony') || href.includes('nintendo') || href.includes('microsoft') || href.includes('valve') || href.includes('steam')) key = 'games';
        else if (href.includes('empresas')) key = 'market';
        else if (href.includes('hardware')) key = 'hardware';
        else if (href.includes('ia-dados') || href.includes('ia')) key = 'ai';
        else if (href.includes('seguranca')) key = 'security';
        if (key) triggerAgentWork(key, 2200);
      });
    });
  };

  const bindIntelligentFeedEvents = () => {
    document.addEventListener('technet:feed-grid-loading', (event) => {
      const detail = event.detail || {};
      const key = getAgentKeyFromApi(detail.api, detail.label);
      if (!key) return;
      applyAgentState(key, 'thinking', 'carregando', 1800);
      updateStatusText(key, 'thinking', 'carregando');
    });

    document.addEventListener('technet:feed-grid-rendered', (event) => {
      const detail = event.detail || {};
      const key = getAgentKeyFromApi(detail.api, detail.label);
      if (!key) return;
      const state = analyzeItemsMood(Array.isArray(detail.items) ? detail.items : [], key);
      applyAgentState(key, state, 'conteúdo', 0);
      updateStatusText(key, state, `${Math.max(0, Number(detail.count || 0))} itens`);
    });

    document.addEventListener('technet:feed-grid-error', (event) => {
      const detail = event.detail || {};
      const key = getAgentKeyFromApi(detail.api, detail.label);
      if (!key) return;
      applyAgentState(key, 'error', 'api', 3000);
      updateStatusText(key, 'error', 'api');
    });
  };

  const startAgentIdleLoop = () => {
    const runPulse = () => {
      document.querySelectorAll('[data-page-agent], [data-agent-card]').forEach((node) => {
        const key = node.getAttribute('data-page-agent') || node.getAttribute('data-agent-card');
        const memory = agentIntelligenceMemory.get(key);
        const currentState = memory?.state || node.getAttribute('data-agent-state') || 'idle';
        if (currentState === 'idle' && !document.hidden) {
          node.classList.add('is-working');
          window.setTimeout(() => node.classList.remove('is-working'), 1200);
        }
      });
      cleanupAgentMemory();
    };

    runPulse();
    window.setInterval(runPulse, 4200);
  };

  ensureTechNetAINav();
  ensureReportsNav();
  injectHomeAgentsShowcase();
  ensureHomeReportsShortcut();
  injectPageHeroAgent();
  wireSpriteStates();
  bindAgentInteractions();
  bindIntelligentFeedEvents();
  if (AGENT_SPRITE_MANIFEST.intelligence.preload) preloadAgentSprites();
  syncAgentsFromBackend();
  buildHermesRanking();
  startAgentIdleLoop();

  const syncMobileMenuOffset = () => {
    if (!header) return;
    const headerHeight = Math.round(header.getBoundingClientRect().height || 78);
    document.documentElement.style.setProperty('--mobile-menu-top', `${headerHeight}px`);
  };

  const closeDropdowns = () => {
    document.querySelectorAll('.has-dropdown.open').forEach((item) => item.classList.remove('open'));
  };

  const closeMenu = () => {
    if (!nav || !menuToggle) return;
    nav.classList.remove('open');
    document.body.classList.remove('nav-open', 'menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    closeDropdowns();
  };

  if (menuToggle && nav) {
    syncMobileMenuOffset();
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.addEventListener('click', () => {
      const willOpen = !nav.classList.contains('open');
      syncMobileMenuOffset();
      nav.classList.toggle('open', willOpen);
      document.body.classList.toggle('nav-open', willOpen);
      document.body.classList.toggle('menu-open', willOpen);
      menuToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (!willOpen) closeDropdowns();
    });

    document.addEventListener('click', (event) => {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(event.target) || menuToggle.contains(event.target)) return;
      closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    nav.querySelectorAll('.has-dropdown > .nav-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        if (window.innerWidth > 860) return;
        const parent = link.parentElement;
        const href = link.getAttribute('href');
        if (!parent) return;
        event.preventDefault();
        const willOpen = !parent.classList.contains('open');
        closeDropdowns();
        parent.classList.toggle('open', willOpen);
        if (!willOpen && href) window.location.href = href;
      });
    });

    nav.querySelectorAll('.dropdown a, .main-nav > ul > li:not(.has-dropdown) a').forEach((link) => {
      link.addEventListener('click', () => closeMenu());
    });

    window.addEventListener('resize', () => {
      syncMobileMenuOffset();
      if (window.innerWidth > 860) closeMenu();
    });

    window.addEventListener('orientationchange', syncMobileMenuOffset);
    window.addEventListener('load', syncMobileMenuOffset);
  }

  if (searchToggle && searchBox) {
    searchToggle.addEventListener('click', () => {
      searchBox.classList.toggle('active');
      syncMobileMenuOffset();
    });
  }

  yearEls.forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
});
