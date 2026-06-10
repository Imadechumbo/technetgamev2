(function () {
  const host = document.querySelector('[data-agent-ranking]');
  if (!host) return;
  if (host.dataset.hermesMeetingInit === '1') return;
  host.dataset.hermesMeetingInit = '1';
  host.dataset.enhancedMeetingRoom = 'true';
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}

  const AGENTS = {
    ai: {
      key: 'ai',
      name: 'Analista IA',
      label: 'IA & Dados',
      role: 'Cruza sinais, automação e padrões de comportamento.',
      image: 'assets/img/openclaw-agents/analista-ia.png',
      color: 'rgba(90, 247, 255, 0.24)',
      weight: 1.24,
      position: 'top-left',
      focus: 'Automação, leitura de sinais e priorização algorítmica.',
      lines: [
        'Detectei padrão forte de interesse e repetição editorial.',
        'O tema favorece automação, IA aplicada e retenção de leitura.',
        'Minha recomendação é elevar prioridade pelo ganho de contexto.'
      ]
    },
    games: {
      key: 'games',
      name: 'Especialista Games',
      label: 'Jogos',
      role: 'Mede apelo de comunidade, hype e potencial de clique.',
      image: 'assets/img/openclaw-agents/especialista-games.png',
      color: 'rgba(191, 112, 255, 0.22)',
      weight: 1.18,
      position: 'top-right',
      focus: 'Hype, comunidade, interesse imediato e CTR.',
      lines: [
        'Comunidade responde rápido quando o assunto entra no radar.',
        'Há potencial de CTR premium se o ângulo ficar claro no título.',
        'Sugiro linguagem forte e visual de impacto para puxar audiência.'
      ]
    },
    hardware: {
      key: 'hardware',
      name: 'Especialista Hardware',
      label: 'Hardware',
      role: 'Avalia impacto prático, benchmark e intenção de compra.',
      image: 'assets/img/openclaw-agents/especialista-hardware.png',
      color: 'rgba(255, 168, 74, 0.23)',
      weight: 1.28,
      position: 'right-mid',
      focus: 'Benchmark real, custo-benefício e desejo de upgrade.',
      lines: [
        'Benchmark confirma relevância operacional para o leitor final.',
        'Quando existe comparação real, a confiança editorial sobe muito.',
        'Defendo destaque porque há utilidade imediata e valor percebido.'
      ]
    },
    market: {
      key: 'market',
      name: 'Analista de Mercado',
      label: 'Empresas',
      role: 'Projeta alcance comercial, CPM e retorno editorial.',
      image: 'assets/img/openclaw-agents/analista-mercado.png',
      color: 'rgba(98, 238, 167, 0.22)',
      weight: 1.14,
      position: 'left-mid',
      focus: 'Receita, valor comercial, amplitude e timing.',
      lines: [
        'Esse tema sustenta tráfego, pauta derivada e monetização.',
        'A janela comercial está aberta e o interesse está quente.',
        'Posso defender destaque porque combina alcance e profundidade.'
      ]
    },
    tech: {
      key: 'tech',
      name: 'Analista Técnico',
      label: 'Tecnologia',
      role: 'Julga profundidade técnica, clareza e consistência.',
      image: 'assets/img/openclaw-agents/analista-tecnico.png',
      color: 'rgba(104, 136, 255, 0.22)',
      weight: 1.20,
      position: 'bottom-left',
      focus: 'Precisão, clareza, profundidade e contexto técnico.',
      lines: [
        'O conteúdo merece subir quando a explicação entrega contexto real.',
        'Existe base técnica suficiente para ir além de notícia rasa.',
        'Minha leitura aponta valor duradouro e boa retenção.'
      ]
    },
    security: {
      key: 'security',
      name: 'Especialista Segurança',
      label: 'Segurança',
      role: 'Aponta urgência, risco e impacto crítico.',
      image: 'assets/img/openclaw-agents/especialista-seguranca.png',
      color: 'rgba(255, 94, 94, 0.20)',
      weight: 1.10,
      position: 'bottom-right',
      focus: 'Criticidade, urgência, risco e responsabilidade editorial.',
      lines: [
        'Se houver risco, o tema precisa de enquadramento limpo e imediato.',
        'Prefiro elevar prioridade quando a informação reduz incerteza.',
        'Minha função é travar exagero e garantir sinal claro ao leitor.'
      ]
    }
  };

  const fallbackTopics = [
    'Nova GPU e impacto em custo-benefício',
    'IA aplicada ao fluxo editorial',
    'Segurança crítica e resposta rápida',
    'Games com alto potencial de comunidade',
    'Movimento estratégico das big techs',
    'Benchmark real de hardware em alta'
  ];

  function getApiBase() {
    return window.RUNTIME_CONFIG?.API_BASE_URL || window.RUNTIME_CONFIG?.API_URL || window.__TNG_API_BASE__ || '';
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>\"]/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] || char;
    });
  }

  function mergeBackendData(payload) {
    const ranking = (payload?.ranking || []).map((entry, index) => {
      const local = AGENTS[entry.key] || {};
      return {
        ...local,
        ...entry,
        image: entry.image || local.image,
        color: entry.color || local.color,
        position: entry.position || local.position,
        lines: Array.isArray(entry.lines) && entry.lines.length ? entry.lines : local.lines,
        focus: entry.focus || local.focus,
        weight: Number(entry.weight || local.weight || 1),
        rank: Number(entry.rank || index + 1),
        score: Number(entry.score || 0),
        weighted: Number(entry.weighted || (Number(entry.score || 0) * Number(entry.weight || local.weight || 1)))
      };
    }).sort(function (a, b) {
      return (b.weighted - a.weighted) || (b.score - a.score);
    }).map(function (entry, index) {
      return { ...entry, rank: index + 1 };
    });

    const dominant = payload?.dominant || ranking[0];
    const consensus = Number(payload?.hermes?.finalScore || payload?.consensus || 0) || Math.round(ranking.reduce(function (acc, item) {
      return acc + item.weighted;
    }, 0) / Math.max(ranking.reduce(function (acc, item) {
      return acc + item.weight;
    }, 0), 1));

    return {
      source: payload?.source || 'backend-live',
      ranking: ranking,
      consensus: consensus,
      dominant: dominant,
      topic: payload?.topic || fallbackTopics[0],
      decision: payload?.hermes?.decision || payload?.decision || 'Hermes consolidou os votos dos especialistas e fechou a decisão editorial.',
      updatedAt: payload?.updatedAt
        ? new Date(payload.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      signals: {
        velocity: Number(payload?.signals?.velocity || payload?.hermes?.velocity || 78),
        confidence: Number(payload?.signals?.confidence || payload?.hermes?.confidence || 84),
        diversity: Number(payload?.signals?.diversity || payload?.hermes?.diversity || 82)
      },
      topicSummary: payload?.topicSummary || payload?.topicSource?.summary || '',
      system: payload?.system || {},
      hermes: payload?.hermes || {}
    };
  }

  function computeFallbackData(health) {
    const categories = health?.categories || {};
    const refreshing = Boolean(health?.refresh?.isRefreshing);
    const cacheAgeSec = Number(health?.cacheAgeSec || 0);
    const translationScore = Number(health?.translation?.avgTranslationScore || 84);
    const duplicatesRemoved = Number(health?.cache?.duplicatesRemoved || health?.duplicatesRemoved || 0);

    const scores = {
      ai: clamp(Math.round(84 + Number(categories.ai || 0) * 0.9 + translationScore * 0.06), 72, 100),
      games: clamp(Math.round(81 + Number(categories.games || 0) * 0.78 + (refreshing ? 2 : 0)), 70, 100),
      hardware: clamp(Math.round(82 + Number(categories.hardware || 0) * 1.45 + (cacheAgeSec < 3600 ? 3 : 0)), 70, 100),
      market: clamp(Math.round(80 + (Number(categories.microsoft || 0) + Number(categories.sony || 0)) * 0.5 + Number(categories.nintendo || 0) * 0.6), 70, 100),
      tech: clamp(Math.round(79 + Number(categories.technology || 0) * 0.82 + duplicatesRemoved * 0.1), 70, 100),
      security: clamp(Math.round(76 + Number(categories.security || 0) * 2.1 + (Number(health?.translation?.failedRecent || 0) > 0 ? 4 : 0)), 68, 100)
    };

    const ranking = Object.values(AGENTS)
      .map(function (agent) { return { ...agent, score: scores[agent.key], weighted: scores[agent.key] * agent.weight }; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (agent, index) {
        return {
          ...agent,
          rank: index + 1,
          reason: 'Fallback visual baseado no estado atual do sistema.',
          lines: agent.lines
        };
      });

    const dominant = ranking[0];
    const consensus = Math.round(ranking.reduce(function (acc, item) { return acc + item.weighted; }, 0) / ranking.reduce(function (acc, item) { return acc + item.weight; }, 0));
    const leaderGap = dominant.score - ranking[1].score;
    const topicPool = [
      dominant.key === 'hardware' ? 'Benchmark de hardware com impacto imediato' : '',
      dominant.key === 'games' ? 'Tema quente com alto potencial de comunidade' : '',
      dominant.key === 'ai' ? 'Automação editorial e leitura de sinais' : '',
      dominant.key === 'security' ? 'Evento sensível com necessidade de clareza' : '',
      dominant.key === 'market' ? 'Movimento estratégico com valor comercial' : '',
      dominant.key === 'tech' ? 'Assunto técnico com profundidade e retenção' : ''
    ].filter(Boolean);
    const topic = topicPool[0] || fallbackTopics[Math.floor(Math.random() * fallbackTopics.length)];

    const decision = leaderGap >= 5
      ? 'Consenso firme para priorizar ' + dominant.label.toLowerCase() + ' como trilha central deste assunto.'
      : 'Consenso equilibrado: ' + dominant.label.toLowerCase() + ' lidera, mas a pauta segue monitorada por múltiplos nichos.';

    return {
      source: 'front-fallback',
      ranking: ranking,
      consensus: consensus,
      dominant: dominant,
      topic: topic,
      decision: decision,
      updatedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      signals: {
        velocity: clamp(Math.round((100 - Math.min(cacheAgeSec / 60, 100)) * 0.72), 42, 99),
        confidence: clamp(Math.round(consensus - 4 + leaderGap), 60, 99),
        diversity: clamp(Math.round(70 + Object.values(categories).filter(function (value) { return Number(value || 0) > 0; }).length * 3), 68, 99)
      },
      topicSummary: '',
      system: {},
      hermes: {
        finalScore: consensus,
        decision: decision
      }
    };
  }

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Falha HTTP ' + response.status);
    return await response.json();
  }

  async function fetchLiveCouncil() {
    const apiBase = getApiBase();
    if (!apiBase) return null;
    const base = apiBase.replace(/\/$/, '');
    try {
      const payload = await fetchJson(base + '/api/hermes/live-council?period=monthly');
      if (payload?.ok && Array.isArray(payload?.ranking) && payload.ranking.length) {
        return mergeBackendData(payload);
      }
      return null;
    } catch (error) {
      console.warn('Hermes live council indisponível, usando fallback:', error);
      return null;
    }
  }

  async function fetchHealthFallback() {
    const apiBase = getApiBase();
    if (!apiBase) return null;
    try {
      return await fetchJson(apiBase.replace(/\/$/, '') + '/api/health');
    } catch (error) {
      console.warn('Hermes meeting room fallback local ativo:', error);
      return null;
    }
  }

  function benchCard(entry) {
    return '\n      <article class="hermes-bench" style="--bench-score:' + escapeHtml(entry.score) + '">\n        <div class="hermes-bench__label"><span>' + escapeHtml(entry.name) + '</span><small>' + escapeHtml(entry.score) + '/100</small></div>\n        <div class="hermes-bench__track"><div class="hermes-bench__fill"></div></div>\n        <div class="hermes-bench__meta"><span>' + escapeHtml(entry.label) + '</span><span>Peso ' + escapeHtml(Number(entry.weight).toFixed(2)) + 'x</span></div>\n      </article>';
  }



  function renderBenchmarkBars(data) {
    const order = ['ai', 'games', 'hardware', 'tech', 'market', 'security'];
    const labels = {
      ai: 'IA & Dados',
      games: 'Jogos',
      hardware: 'Hardware',
      tech: 'Tecnologia',
      market: 'Empresas',
      security: 'Segurança'
    };
    const byKey = Object.create(null);
    (data.ranking || []).forEach(function(entry) {
      byKey[entry.key] = entry;
    });

    const bars = order.map(function(key) {
      const entry = byKey[key];
      if (!entry) return '';
      return `
        <div class="hermes-visual-benchmark__bar hermes-visual-benchmark__bar--${escapeHtml(key)}" style="--bench-score:${escapeHtml(entry.score)}">
          <span class="hermes-visual-benchmark__trend">↑</span>
          <strong>${escapeHtml(entry.score)}%</strong>
          <i aria-hidden="true"></i>
          <span>${escapeHtml(labels[key] || entry.label || entry.name)}</span>
          <small>Peso ${escapeHtml(Number(entry.weight).toFixed(2))}x</small>
        </div>`;
    }).join('');

    return `
      <section class="hermes-visual-benchmark" aria-label="Benchmark por agente">
        <div class="hermes-visual-benchmark__head">
          <span class="hermes-visual-benchmark__kicker">Benchmark por agente</span>
          <h3>Leitura visual do conselho</h3>
          <p>Cada cor representa um agente avaliando o mesmo tema.</p>
        </div>
        <div class="hermes-visual-benchmark__bars">${bars}</div>
      </section>`;
  }

  function render(data) {
    const liveMode = data.source === 'backend-live';
    const summaryText = liveMode
      ? 'Hermes está lendo o backend em tempo real: pesos aprendidos, sinais do OpenClaw e snapshot editorial entram na decisão final desta reunião.'
      : 'Os agentes discutem o tema, projetam relevância, cruzam benchmark e enviam seus votos para o Hermes tomar a decisão final com base no peso de cada especialidade.';

    const decisionBoard = `
          <section class="hermes-meeting__decision-board" aria-label="Quadro de decisões da empresa">
            <div class="hermes-meeting__decision-board-head">
              <span class="hermes-meeting__decision-board-kicker">Quadro de decisões da empresa</span>
              <strong>Pauta em avaliação estratégica</strong>
            </div>
            <div class="hermes-meeting__decision-board-grid">
              <div class="hermes-meeting__decision-cell">
                <span>Assunto</span>
                <strong>${escapeHtml(data.topic)}</strong>
              </div>
              <div class="hermes-meeting__decision-cell">
                <span>Líder da rodada</span>
                <strong>${escapeHtml(data.dominant.name)} · ${escapeHtml(data.dominant.score)}/100</strong>
              </div>
              <div class="hermes-meeting__decision-cell">
                <span>Consenso Hermes</span>
                <strong>${escapeHtml(data.consensus)}% · ${liveMode ? 'backend real' : 'fallback local'}</strong>
              </div>
              <div class="hermes-meeting__decision-cell">
                <span>Frentes críticas</span>
                <strong>${escapeHtml(data.ranking.slice(0, 3).map(function(item){ return item.label; }).join(' • '))}</strong>
              </div>
            </div>
            <div class="hermes-meeting__decision-stream">
              ${data.ranking.slice(0, 3).map(function(entry, idx) {
                return `<div class="hermes-meeting__stream-line"><span>${escapeHtml(String(idx + 1).padStart(2, '0'))}</span><p>${escapeHtml(entry.lines?.[1] || entry.reason || entry.focus || '')}</p></div>`;
              }).join('')}
            </div>
          </section>`;

    const agentsMarkup = data.ranking.map(function (entry) {
      return `
            <article class="hermes-meeting__agent" data-agent-key="${escapeHtml(entry.key)}" data-pos="${escapeHtml(entry.position)}" style="--agent-glow:${escapeHtml(entry.color)}">
              <div class="hermes-meeting__bubble">
                <span class="hermes-meeting__bubble-kicker">Reunião ativa</span>
                <p data-bubble-text>${escapeHtml(entry.lines?.[0] || entry.reason || '')}</p>
                <small>${escapeHtml(entry.focus || '')}</small>
              </div>
              <button class="hermes-meeting__agent-button" type="button" tabindex="0" aria-label="${escapeHtml(entry.name)}: ${escapeHtml(entry.label)}">
                <span class="hermes-meeting__rank">#${escapeHtml(entry.rank)} • ${escapeHtml(entry.score)}/100</span>
                <span class="hermes-meeting__avatar-wrap">
                  <img class="hermes-meeting__avatar" src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.name)}" loading="lazy" decoding="async">
                </span>
                <span class="hermes-meeting__name">${escapeHtml(entry.name)}</span>
                <span class="hermes-meeting__label">${escapeHtml(entry.label)}</span>
                <span class="hermes-meeting__vote">Voto atual <strong>${escapeHtml(Math.round(entry.weighted / Math.max(entry.weight, 0.01)))}/100</strong> <span>Peso ${escapeHtml(Number(entry.weight).toFixed(2))}x</span></span>
              </button>
            </article>`;
    }).join('');

    const mobileCards = data.ranking.map(function (entry) {
      return `
                <article class="hermes-meeting__mobile-card">
                  <div class="hermes-meeting__mobile-rank">#${escapeHtml(entry.rank)}</div>
                  <img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.name)}" loading="lazy" decoding="async">
                  <div class="hermes-meeting__mobile-agent-copy">
                    <strong>${escapeHtml(entry.name)}</strong>
                    <span>${escapeHtml(entry.label)}</span>
                    <small>${escapeHtml(entry.score)}/100 · Peso ${escapeHtml(Number(entry.weight).toFixed(2))}x</small>
                  </div>
                </article>`;
    }).join('');

    host.innerHTML = `
      <div class="hermes-ranking--enhanced" data-hermes-meeting-room>
        <div class="hermes-meeting__hud">
          <div class="hermes-meeting__summary">
            <span class="hermes-meeting__eyebrow">${liveMode ? 'Hermes real backend live' : 'Hermes live council'}</span>
            <h3>Sala de reunião virtual ao vivo com benchmark editorial por nicho</h3>
            <p>${escapeHtml(summaryText)}</p>
            <div class="hermes-meeting__chips">
              <span class="hermes-chip">Tema atual <strong>${escapeHtml(data.topic)}</strong></span>
              <span class="hermes-chip">Líder atual <strong>${escapeHtml(data.dominant.name)}</strong></span>
              <span class="hermes-chip">Atualizado <strong>${escapeHtml(data.updatedAt)}</strong></span>
              <span class="hermes-chip">Modo <strong>${liveMode ? 'Backend real' : 'Fallback local'}</strong></span>
            </div>
          </div>
          <div class="hermes-meeting__benchmarks">
            ${renderBenchmarkBars(data)}
          </div>
        </div>
        <div class="hermes-meeting__arena" data-hermes-arena>
          <canvas class="hermes-meeting__canvas" data-hermes-canvas></canvas>
          <div class="hermes-meeting__core" aria-hidden="true"></div>
          <div class="hermes-meeting__consensus-pulse" aria-hidden="true"></div>
          <div class="hermes-meeting__consensus-badge" aria-live="polite">
            <span>Consenso final</span>
            <strong>${escapeHtml(data.consensus)}%</strong>
            <small>${escapeHtml(data.dominant.label)} domina agora</small>
          </div>
          <div class="hermes-meeting__ticker" data-hermes-ticker>${escapeHtml(data.decision)}</div>
          ${decisionBoard}
          ${agentsMarkup}
          <div class="hermes-meeting__hermes" data-hermes-core>
            <div class="hermes-meeting__hermes-visual">
              <span class="hermes-meeting__hermes-glow" aria-hidden="true"></span>
              <img class="hermes-meeting__hermes-image" src="assets/img/hermes-decisor-central.png" alt="Hermes dourado tomando a decisão final da reunião" loading="eager" decoding="async">
            </div>
            <div class="hermes-meeting__decision">
              <div class="hermes-meeting__decision-kicker">Decisão final do Hermes</div>
              <h4 class="hermes-meeting__decision-title">${escapeHtml(data.dominant.name)} conduz a pauta</h4>
              <p class="hermes-meeting__decision-copy">${escapeHtml(data.decision)} Hermes consolida os votos, pondera benchmark, histórico aprendido e libera o destaque editorial com leitura visual de relevância entre os nichos.</p>
              <div class="hermes-meeting__decision-meta">
                <span class="hermes-meeting__decision-pill">Confiança ${escapeHtml(data.signals.confidence)}%</span>
                <span class="hermes-meeting__decision-pill">Velocidade ${escapeHtml(data.signals.velocity)}%</span>
                <span class="hermes-meeting__decision-pill">Cobertura ${escapeHtml(data.signals.diversity)}%</span>
              </div>
            </div>
          </div>
        </div>
        <div class="hermes-meeting__mobile-cta" data-hermes-mobile>
          <div class="hermes-meeting__mobile-head">
            <div class="hermes-meeting__mobile-icon-wrap">
              <img class="hermes-meeting__mobile-icon" src="assets/img/hermesdourado.png" alt="Hermes dourado" loading="lazy" decoding="async">
            </div>
            <div class="hermes-meeting__mobile-copy">
              <span class="hermes-meeting__mobile-kicker">Hermes mobile access</span>
              <strong>Conheça nossos agentes TechNet</strong>
              <p>No celular a sala principal permanece limpa. Toque para abrir a versão compacta com mini agents estilo smile e benchmark visual logo no topo.</p>
            </div>
          </div>
          <div class="hermes-meeting__mobile-actions">
            <a class="hermes-meeting__mobile-button hermes-meeting__mobile-link" href="agentes-technet.html">Conheça nossos agentes TechNet</a>
            <span class="hermes-meeting__mobile-pill">Consenso ${escapeHtml(data.consensus)}%</span>
            <span class="hermes-meeting__mobile-pill">Líder ${escapeHtml(data.dominant.label)}</span>
          </div>
          <div class="hermes-meeting__mobile-smiles">
            ${data.ranking.slice(0,6).map(function(entry){
              return `<span class="hermes-meeting__mobile-smile" title="${escapeHtml(entry.name)}"><img src="${escapeHtml(entry.image)}" alt="${escapeHtml(entry.name)}" loading="lazy" decoding="async"></span>`;
            }).join('')}
          </div>
        </div>
      </div>`;

    initArenaEffects(data);
  }

  function initArenaEffects(data) {
    const arena = host.querySelector('[data-hermes-arena]');
    const canvas = host.querySelector('[data-hermes-canvas]');
    const hermes = host.querySelector('[data-hermes-core]');
    const agents = Array.from(host.querySelectorAll('.hermes-meeting__agent'));
    const ticker = host.querySelector('[data-hermes-ticker]');
    if (!arena || !canvas || !hermes || !agents.length) return;

    const context = canvas.getContext('2d');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resizeCanvas() {
      const rect = arena.getBoundingClientRect();
      canvas.width = Math.max(1, rect.width * window.devicePixelRatio);
      canvas.height = Math.max(1, rect.height * window.devicePixelRatio);
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    function draw() {
      const arenaRect = arena.getBoundingClientRect();
      const hermesRect = hermes.getBoundingClientRect();
      const hx = hermesRect.left - arenaRect.left + hermesRect.width / 2;
      const hy = hermesRect.top - arenaRect.top + Math.min(hermesRect.height * 0.20, 70);
      context.clearRect(0, 0, arenaRect.width, arenaRect.height);

      agents.forEach(function (agent, index) {
        const rect = agent.getBoundingClientRect();
        const ax = rect.left - arenaRect.left + rect.width / 2;
        const ay = rect.top - arenaRect.top + rect.height / 2;
        const gradient = context.createLinearGradient(ax, ay, hx, hy);
        gradient.addColorStop(0, 'rgba(94,255,211,0.10)');
        gradient.addColorStop(0.55, 'rgba(94,255,211,0.26)');
        gradient.addColorStop(1, 'rgba(255,205,86,0.34)');
        context.beginPath();
        context.moveTo(ax, ay);
        const controlYOffset = index % 2 === 0 ? -60 : 60;
        context.bezierCurveTo(ax + (hx - ax) * 0.25, ay + controlYOffset, ax + (hx - ax) * 0.75, hy - controlYOffset, hx, hy);
        context.strokeStyle = gradient;
        context.lineWidth = 2;
        context.shadowColor = 'rgba(255,205,86,0.18)';
        context.shadowBlur = 14;
        context.stroke();
        context.shadowBlur = 0;
      });

      if (!prefersReducedMotion) window.requestAnimationFrame(draw);
    }

    resizeCanvas();
    draw();
    window.addEventListener('resize', resizeCanvas);
    if (prefersReducedMotion) window.addEventListener('resize', draw);

    const bubbleLead = {};
    data.ranking.forEach(function (entry) {
      bubbleLead[entry.key] = ['Reunião ativa'].concat((entry.lines || AGENTS[entry.key]?.lines || []).slice(0, 3));
    });

    let messageIndex = 0;
    const tickerLines = [
      data.decision,
      data.dominant.name + ' lidera a rodada atual com ' + data.dominant.score + '/100.',
      'Hermes consolidou benchmark, relevância e peso de especialidade em ' + data.consensus + '% de consenso.'
    ];

    agents.forEach(function (agent) {
      const bubble = agent.querySelector('.hermes-meeting__bubble');
      const textNode = bubble?.querySelector('[data-bubble-text]');
      const kicker = bubble?.querySelector('.hermes-meeting__bubble-kicker');
      const key = agent.getAttribute('data-agent-key');
      if (!bubble || !textNode || !key) return;

      let localIndex = 1;
      let revealTimer = null;
      const reveal = function () {
        agents.forEach(function (item) {
          item.classList.remove('is-reading');
          const otherBubble = item.querySelector('.hermes-meeting__bubble');
          if (otherBubble && item !== agent) otherBubble.classList.remove('is-visible', 'is-priority');
        });
        agent.classList.add('is-reading');
        bubble.classList.add('is-visible', 'is-priority');
        if (kicker) kicker.textContent = bubbleLead[key][0];
        const fullText = bubbleLead[key][localIndex % bubbleLead[key].length];
        if (revealTimer) {
          window.clearTimeout(revealTimer);
          revealTimer = null;
        }
        if (prefersReducedMotion) {
          textNode.textContent = fullText;
          return;
        }
        textNode.textContent = '';
        let i = 0;
        const tick = function () {
          textNode.textContent = fullText.slice(0, i + 1);
          i += 1;
          if (i < fullText.length) {
            revealTimer = window.setTimeout(tick, i < 18 ? 26 : 16);
          }
        };
        tick();
      };
      const hide = function () {
        agent.classList.remove('is-reading');
        bubble.classList.remove('is-priority');
        bubble.classList.remove('is-visible');
      };
      reveal();
      agent.addEventListener('mouseenter', function () {
        localIndex += 1;
        reveal();
      });
      agent.addEventListener('focusin', function () {
        localIndex += 1;
        reveal();
      });
      agent.addEventListener('mouseleave', hide);
      agent.addEventListener('focusout', hide);
    });

    if (!prefersReducedMotion) {
      window.setInterval(function () {
        const active = agents[messageIndex % agents.length];
        const bubble = active.querySelector('.hermes-meeting__bubble');
        const textNode = bubble?.querySelector('[data-bubble-text]');
        const key = active.getAttribute('data-agent-key');
        if (bubble && textNode && key) {
          const lines = bubbleLead[key] || ['Reunião ativa'];
          const nextLine = lines[1 + ((messageIndex + 1) % Math.max(lines.length - 1, 1))] || lines[0];
          bubble.classList.add('is-visible');
          textNode.textContent = nextLine;
        }
        if (ticker) ticker.textContent = tickerLines[messageIndex % tickerLines.length];
        messageIndex += 1;
      }, 3200);
    }
  }

  async function init() {
    host.innerHTML = '<div class="hermes-meeting__loading">Montando sala de reunião virtual do Hermes...</div>';
    try {
      const liveCouncil = await fetchLiveCouncil();
      if (liveCouncil) {
        render(liveCouncil);
        return;
      }
      const health = await fetchHealthFallback();
      render(computeFallbackData(health || {}));
    } catch (error) {
      console.error('Hermes reports init failed:', error);
      render(computeFallbackData({}));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
