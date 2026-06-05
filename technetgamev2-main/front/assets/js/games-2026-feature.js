document.addEventListener('DOMContentLoaded', async () => {
  const mount = document.querySelector('[data-games-2026-list]');
  if (!mount) return;

  const groups = [
    {
      title: 'Sequências e continuação de franquias AAA',
      intro: 'Grandes marcas, retorno de séries históricas e projetos que devem dominar debate, buscas e vídeos em 2026.',
      items: [
        { rank: 1, title: 'Grand Theft Auto VI', release: '19 de novembro de 2026', platforms: 'PS5 e Xbox Series X/S', summary: 'Vice City volta ao centro da cultura gamer com narrativa criminal moderna, escala absurda e potencial para se tornar o maior lançamento do ciclo.', query: 'Grand Theft Auto VI official trailer Rockstar', official: 'https://www.rockstargames.com/VI/' },
        { rank: 2, title: 'Resident Evil Requiem', release: '27 de fevereiro de 2026', platforms: 'PS5, Xbox Series X/S e PC', summary: 'Capcom mistura horror tenso, dupla de protagonistas e atmosfera chuvosa para recolocar Resident Evil no centro da conversa logo no início do ano.', query: 'Resident Evil Requiem official trailer Capcom', official: 'https://www.capcom-games.com/product/en-uk/' },
        { rank: 3, title: 'Final Fantasy VII Remake – Parte 3', release: '2026', platforms: 'PS5, depois PC e outras plataformas', summary: 'O capítulo final da trilogia deve entregar o clímax contra Sephiroth, escopo maior, Highwind e um encerramento de peso para a releitura de FF7.', query: 'Final Fantasy VII Remake Part 3 trailer', official: 'https://www.square-enix-games.com/' },
        { rank: 4, title: 'Assassin’s Creed Codename Hexe', release: 'Final de 2026', platforms: 'PS5, Xbox Series X/S e PC', summary: 'Ubisoft promete um Assassin’s Creed mais sombrio, focado em investigação, ocultismo e perseguição em plena caça às bruxas europeia.', query: 'Assassins Creed Codename Hexe trailer Ubisoft', official: 'https://www.ubisoft.com/' },
        { rank: 5, title: 'Nioh 3', release: '6 de fevereiro de 2026', platforms: 'PS5 e PC', summary: 'Team Ninja leva a série para o Bakumatsu, mistura yokais com pólvora e fecha a trilogia em uma Kyoto corrompida e muito mais agressiva.', query: 'Nioh 3 trailer Team Ninja', official: 'https://teamninja-studio.com/' },
        { rank: 6, title: 'Ace Combat 8: Wings of Theve', release: '2026', platforms: 'PS5, Xbox Series X/S e PC', summary: 'A franquia de combate aéreo volta com narrativa cinematográfica, dogfights de nova geração e potencial para reacender a base clássica de Ace Combat.', query: 'Ace Combat 8 Wings of Theve trailer', official: 'https://www.bandainamcoent.com/' },
        { rank: 7, title: 'Control: Resonant', release: '2026', platforms: 'PS5, Xbox Series X/S e PC', summary: 'Remedy expande Control para Manhattan e aposta em distúrbios paranaturais em escala urbana, aprofundando ainda mais seu universo conectado.', query: 'Control Resonant trailer Remedy', official: 'https://www.remedygames.com/' },
        { rank: 8, title: 'Dragon Quest VII: Reimagined', release: '5 de fevereiro de 2026', platforms: 'PS5, Xbox Series X/S, Switch, Switch 2 e PC', summary: 'Releitura moderna de um RPG gigantesco, agora com visual diorama, sistema de subclasses e centenas de horas de exploração em múltiplas eras.', query: 'Dragon Quest VII Reimagined trailer', official: 'https://www.square-enix-games.com/' }
      ]
    },
    {
      title: 'Novos títulos AAA e grandes franquias inéditas',
      intro: 'Projetos ambiciosos que representam novas apostas de estúdios gigantes, licenças poderosas e nomes com cara de vitrine premium.',
      items: [
        { rank: 9, title: 'Pragmata', release: '24 de abril de 2026', platforms: 'PS5, Xbox Series X/S, PC e Switch 2', summary: 'A Capcom finalmente coloca no calendário seu sci-fi mais misterioso, misturando shooter, puzzle e uma atmosfera de ficção científica bem autoral.', query: 'Pragmata official trailer Capcom', official: 'https://www.capcom-games.com/' },
        { rank: 10, title: 'Marvel’s Wolverine', release: 'Último trimestre de 2026', platforms: 'PS5', summary: 'A Insomniac tem tudo para transformar Wolverine em um dos blockbusters mais violentos e comentados do ano, com combate brutal e apelo massivo.', query: 'Marvel Wolverine trailer Insomniac', official: 'https://www.playstation.com/' },
        { rank: 11, title: 'Marvel Tokon: Fighting Souls', release: '2026', platforms: 'PS5 e PC', summary: 'Marvel + Arc System Works é combinação explosiva: visual afiado, combate 2D estiloso e potencial real de virar novo fenômeno competitivo.', query: 'Marvel Tokon Fighting Souls trailer', official: 'https://www.marvel.com/games' },
        { rank: 12, title: 'Phantom Blade Zero', release: '9 de setembro de 2026', platforms: 'PS5 e PC', summary: 'Um action RPG de estética kung-fu punk que mistura velocidade, dificuldade e direção de arte forte o bastante para virar um dos assuntos do semestre.', query: 'Phantom Blade Zero trailer', official: 'https://www.playstation.com/' },
        { rank: 13, title: 'Saros', release: '30 de abril de 2026', platforms: 'PS5', summary: 'A Housemarque aposta novamente em ação intensa, visual premium e uma pegada arcade moderna que pode repetir o impacto de Returnal.', query: 'Saros trailer Housemarque', official: 'https://www.playstation.com/' },
        { rank: 14, title: '007: First Light', release: '2026', platforms: 'PS5, Xbox Series X/S e PC', summary: 'A IO Interactive tem a chance de entregar um Bond jogável com stealth elegante, liberdade de abordagem e assinatura cinematográfica real.', query: '007 First Light trailer IO Interactive', official: 'https://ioi.dk/' },
        { rank: 15, title: 'Diablo IV: Senhor do Ódio', release: '2026', platforms: 'PS5, Xbox Series X/S e PC', summary: 'A expansão centrada em Mephisto reforça o endgame, adiciona nova região e mantém Diablo IV vivo na conversa entre temporadas e conteúdo de longo prazo.', query: 'Diablo IV Lord of Hatred trailer', official: 'https://diablo4.blizzard.com/' },
        { rank: 16, title: 'Duskbloods', release: '2026', platforms: 'Switch 2', summary: 'A FromSoftware volta ao gótico com vampirismo, magia de sangue e conflito entre clãs, misturando densidade narrativa e combate visceral.', query: 'Duskbloods trailer FromSoftware', official: 'https://www.fromsoftware.jp/' },
        { rank: 17, title: 'Pokémon Pokopia', release: '2026', platforms: 'Switch 2', summary: 'A promessa é levar a ideia de mundo aberto da franquia para outro patamar, com mais exploração, ecossistemas vivos e salto técnico perceptível.', query: 'Pokemon Pokopia trailer', official: 'https://www.pokemon.com/' },
        { rank: 18, title: 'Assetto Corsa EVO', release: '2026', platforms: 'PC, PS5 e Xbox Series X/S', summary: 'Simulação pura, motor renovado e clima dinâmico colocam EVO como um dos projetos mais relevantes para quem acompanha corrida e eSports.', query: 'Assetto Corsa EVO trailer', official: 'https://assettocorsa.gg/' },
        { rank: 19, title: 'Forza Horizon 6', release: '2026', platforms: 'Xbox Series X/S e PC', summary: 'A Playground pode renovar a fórmula de mundo aberto da série com novo mapa, eventos mais narrativos e outro salto de espetáculo visual.', query: 'Forza Horizon 6 trailer', official: 'https://forza.net/' },
        { rank: 20, title: 'Halo: Campanha Evoluída', release: '2026', platforms: 'Xbox Series X/S e PC', summary: 'Halo tenta recuperar força no single-player com campanha mais guiada, densidade de eventos maior e IA inimiga mais consistente.', query: 'Halo campaign evolved trailer', official: 'https://www.halowaypoint.com/' },
        { rank: 21, title: 'Tomb Raider Legacy of Atlantis', release: '2026', platforms: 'PS5, Xbox Series X/S e PC', summary: 'Uma releitura moderna da essência clássica de Lara Croft, agora reconstruída com tecnologia atual e escopo mais alinhado ao gosto contemporâneo.', query: 'Tomb Raider Legacy of Atlantis trailer', official: 'https://www.tombraider.com/' },
        { rank: 22, title: 'Marvel 1943: A Ascensão da Hydra', release: '2026', platforms: 'PS5, Xbox Series X/S e PC', summary: 'Capitão América e Pantera Negra em plena Segunda Guerra Mundial fazem deste um dos projetos narrativos mais atraentes do calendário.', query: 'Marvel 1943 Rise of Hydra trailer', official: 'https://www.marvel.com/games' }
      ]
    },
    {
      title: 'Destaques indie e produções AA de 2026',
      intro: 'Projetos com personalidade forte, potencial de surpresa crítica e espaço real para viralizar entre comunidade, criadores e público hardcore.',
      items: [
        { rank: 23, title: 'High On Life 2', release: '13 de fevereiro de 2026', platforms: 'Xbox Series X/S, PC e PS5', summary: 'O FPS cômico quer ampliar o absurdo do original com mais armas falantes, mundos alienígenas bizarros e um humor ainda mais caótico.', query: 'High On Life 2 trailer', official: 'https://www.squanchgames.com/' },
        { rank: 24, title: 'John Carpenter’s Toxic Commando', release: '12 de março de 2026', platforms: 'PS5, Xbox Series X/S e PC', summary: 'Co-op, zumbis, veículos e vibe de filme B transformam Toxic Commando em um dos lançamentos mais divertidos para audiência de ação em grupo.', query: 'John Carpenter Toxic Commando trailer', official: 'https://www.focus-entmt.com/' },
        { rank: 25, title: 'Ontos', release: '2026', platforms: 'PC e consoles modernos', summary: 'A Frictional volta ao terror filosófico com uma experiência de ficção científica e horror psicológico feita para gerar discussão e interpretação.', query: 'Ontos trailer Frictional Games', official: 'https://frictionalgames.com/' },
        { rank: 26, title: 'Highguard', release: '26 de janeiro de 2026', platforms: 'PC, PS5 e Xbox Series X/S', summary: 'Hero shooter de ex-devs de Apex e Titanfall com mobilidade, armas responsivas e potencial claro para conquistar o público competitivo.', query: 'Highguard trailer Wildlight Entertainment', official: 'https://www.wildlight.gg/' }
      ]
    }
  ];

  const LOCAL_REAL_COVERS = {
    'Control: Resonant': 'assets/img/game-control.png',
    'Marvel’s Wolverine': 'assets/img/game-wolverine.png',
    "Marvel's Wolverine": 'assets/img/game-wolverine.png',
    'Saros': 'assets/img/game-saros.png',
    'Resident Evil Requiem': 'assets/img/game-requiem-real.png',
    'Grand Theft Auto VI': 'assets/img/game-gta6-real.jpg',
    'Crimson Desert': 'assets/img/game-crimson-real.jpg',
    'Pragmata': 'assets/img/game-pragmata-real.png',
    'Duskbloods': 'assets/img/game-duskbloods.png',
    'Pokémon Pokopia': 'assets/img/game-pokopia.jpg',
    'Pokemon Pokopia': 'assets/img/game-pokopia.jpg',
    'Assassin’s Creed Codename Hexe': 'front/assets/img/game-cover-assassin-s-creed-codename-hexe.svg'
  };

  const TRUSTED_API_COVER_SOURCES = new Set(['rawg', 'steamgriddb', 'igdb']);

  function isRemoteHttpUrl(value = '') {
    try {
      const url = new URL(String(value));
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function isAllowedLocalRealCover(value = '') {
    return /^assets\/img\/.+\.(?:png|jpe?g|webp)$/i.test(String(value || '').trim());
  }

  function getLocalRealCover(title = '') {
    if (!title) return null;

    const localRealCover =
      LOCAL_REAL_COVERS[title] ||
      LOCAL_REAL_COVERS[title.replace(/’/g, "'")] ||
      LOCAL_REAL_COVERS[title.replace(/'/g, '’')] ||
      null;

    return isAllowedLocalRealCover(localRealCover) ? localRealCover : null;
  }

  function apiCoverImage(data) {
    return data?.selected?.image || data?.image || data?.cover || '';
  }

  function apiCoverSource(data) {
    return data?.selected?.source || data?.source || '';
  }

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function portalListKey(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'grupo';
  }

  function detailsUrl(game, context) {
    const firstItemWithImage = Array.isArray(context?.items)
      ? context.items.find((item) => item?.url && item?.image)
      : null;
    const firstItem = Array.isArray(context?.items) ? context.items.find((item) => item?.url) : null;
    return firstItemWithImage?.url || firstItem?.url || game.official || '#';
  }

  function apiUrl(path = '') {
    if (typeof window.tngApiUrl === 'function') {
      return window.tngApiUrl(path);
    }

    const base = String(
      window.RUNTIME_CONFIG?.API_BASE_URL ||
      window.RUNTIME_CONFIG?.API_URL ||
      window.RUNTIME_CONFIG?.API_BASE ||
      'https://api.technetgame.com.br'
    ).replace(/\/$/, '');
    const normalizedPath = String(path || '').startsWith('/') ? String(path || '') : `/${path || ''}`;
    return `${base}${normalizedPath}`;
  }

  function isValidApiCoverPayload(data) {
    const image = apiCoverImage(data);
    const source = apiCoverSource(data);

    return (
      data?.ok === true &&
      Boolean(data?.selected) &&
      (data.selected.titleMatch === true || data.selected.aliasMatch === true) &&
      Boolean(image) &&
      TRUSTED_API_COVER_SOURCES.has(String(source).toLowerCase()) &&
      isRemoteHttpUrl(image)
    );
  }

  async function resolveApiCover(game) {
    try {
      const response = await fetch(apiUrl(`/api/games/cover?q=${encodeURIComponent(game.title)}`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      if (!isValidApiCoverPayload(data)) {
        return null;
      }

      return {
        image: apiCoverImage(data),
        source: String(apiCoverSource(data)).toLowerCase()
      };
    } catch (error) {
      console.warn('[games-2026] Failed to load API cover for', game.title, error?.message || error);
      return null;
    }
  }

  async function mediaImage(game) {
    const apiCover = await resolveApiCover(game);
    if (apiCover?.image) return apiCover;

    const localRealCover = getLocalRealCover(game.title);
    if (localRealCover) {
      return { image: localRealCover, source: 'local-real' };
    }

    return null;
  }

  function skeletonCard(game) {
    return `
      <article class="game-2026-portal-card is-loading" id="game-${game.rank}">
        <div class="game-2026-portal-main">
          <div class="game-2026-cover-wrap shimmer-block"></div>
          <div class="game-2026-portal-copy">
            <div class="game-2026-topline">
              <span class="game-2026-rank">#${game.rank}</span>
              <span class="game-2026-tag">Especial 2026</span>
            </div>
            <h4>${game.title}</h4>
            <p class="game-2026-summary">${game.summary}</p>
            <div class="game-2026-meta">
              <div><span>Lançamento previsto</span><strong>${game.release}</strong></div>
              <div><span>Plataformas</span><strong>${game.platforms}</strong></div>
            </div>
            <div class="game-2026-news-preview shimmer-block"></div>
          </div>
        </div>
        <aside class="game-2026-news-panel">
          <div class="game-2026-news-head">
            <span class="game-2026-news-kicker">Notícias e contexto</span>
            <strong>Carregando cobertura</strong>
          </div>
          <div class="game-2026-news-list">
            <div class="game-news-skeleton shimmer-line"></div>
            <div class="game-news-skeleton shimmer-line"></div>
            <div class="game-news-skeleton shimmer-line"></div>
          </div>
        </aside>
      </article>
    `;
  }

  async function getGameContext(game) {
    try {
      const response = await fetch(apiUrl(`/api/news/game-search?q=${encodeURIComponent(game.title)}&limit=3`));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      return {
        ok: Boolean(payload?.ok),
        items: Array.isArray(payload?.items) ? payload.items : []
      };
    } catch (error) {
      console.warn('[games-2026] Failed to load context for', game.title, error?.message || error);
      return {
        ok: false,
        items: []
      };
    }
  }

  function getRenderableNewsItems(items = []) {
    return Array.isArray(items)
      ? items.filter((item) => item?.url && item?.image && item?.title)
      : [];
  }

  function renderNewsItems(items = []) {
    const renderableItems = getRenderableNewsItems(items);
    if (!renderableItems.length) {
      return '';
    }

    return renderableItems.map((item) => `
      <a class="game-news-item" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async" width="132" height="88">
        <div class="game-news-copy">
          <span>${escapeHtml(item.source || 'Cobertura externa')}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml((item.description || 'Leia a cobertura completa no link original.').slice(0, 120))}</p>
        </div>
      </a>
    `).join('');
  }

  async function renderMedia(game, context) {
    const link = detailsUrl(game, context);
    const cover = await mediaImage(game);

    if (!cover?.image) {
      return `
        <div class="game-2026-media-link game-2026-cover-wrap cover-missing" aria-label="Capa oficial indisponível para ${escapeHtml(game.title)}">
          <div class="game-2026-cover-missing">
            <span>Aguardando capa oficial</span>
          </div>
          <div class="game-2026-cover-overlay">
            <span class="game-2026-rank">#${game.rank}</span>
            <span class="game-2026-tag">Especial 2026</span>
          </div>
        </div>
      `;
    }

    return `
      <a class="game-2026-media-link game-2026-cover-wrap" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir mais detalhes sobre ${escapeHtml(game.title)}">
        <img class="game-2026-cover" src="${escapeHtml(cover.image)}" alt="${escapeHtml(game.title)}" loading="lazy" decoding="async" width="1280" height="720">
        <div class="game-2026-cover-overlay">
          <span class="game-2026-rank">#${game.rank}</span>
          <span class="game-2026-tag">Especial 2026</span>
        </div>
        <span class="game-2026-media-badge">Abrir detalhes ↗</span>
      </a>
    `;
  }

  function renderFallbackCard(game = {}) {
    const title = escapeHtml(game.title || 'Jogo sem título');
    const release = escapeHtml(game.release || '2026');
    const platforms = escapeHtml(game.platforms || 'Plataformas a confirmar');
    const summary = escapeHtml(game.summary || 'Conteúdo temporariamente indisponível.');
    const link = escapeHtml(game.official || '#');

    return `
      <article class="game-2026-portal-card" id="game-${escapeHtml(game.rank || '0')}">
        <div class="game-2026-portal-main">
          <div class="game-2026-media-link game-2026-cover-wrap cover-missing">
            <div class="game-2026-cover-missing">
              <span>Aguardando capa oficial</span>
            </div>
            <div class="game-2026-cover-overlay">
              <span class="game-2026-rank">#${escapeHtml(game.rank || '0')}</span>
              <span class="game-2026-tag">Especial 2026</span>
            </div>
          </div>
          <div class="game-2026-portal-copy">
            <div class="game-2026-heading-row">
              <div>
                <h4>${title}</h4>
                <p class="game-2026-summary">${summary}</p>
              </div>
            </div>
            <div class="game-2026-meta">
              <div><span>Lançamento previsto</span><strong>${release}</strong></div>
              <div><span>Plataformas</span><strong>${platforms}</strong></div>
            </div>
            <div class="game-2026-links">
              <a class="text-link-strong" href="${link}" target="_blank" rel="noopener noreferrer">Página oficial ↗</a>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  async function renderGame(game) {
    try {
      const context = await getGameContext(game);
      const link = detailsUrl(game, context);

      return `
        <article class="game-2026-portal-card" id="game-${game.rank}">
          <div class="game-2026-portal-main">
            ${await renderMedia(game, context)}

            <div class="game-2026-portal-copy">
              <div class="game-2026-heading-row">
                <div>
                  <h4>${escapeHtml(game.title)}</h4>
                  <p class="game-2026-summary">${escapeHtml(game.summary)}</p>
                </div>
              </div>

              <div class="game-2026-meta">
                <div><span>Lançamento previsto</span><strong>${escapeHtml(game.release)}</strong></div>
                <div><span>Plataformas</span><strong>${escapeHtml(game.platforms)}</strong></div>
              </div>

              <div class="game-2026-links">
                <a class="text-link-strong" href="${escapeHtml(game.official || '#')}" target="_blank" rel="noopener noreferrer">Página oficial ↗</a>
                <a class="text-link-strong" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Mais detalhes ↗</a>
              </div>
            </div>
          </div>

          ${getRenderableNewsItems(context.items).length ? `
          <aside class="game-2026-news-panel">
            <div class="game-2026-news-head">
              <span class="game-2026-news-kicker">Cobertura ao lado</span>
              <strong>Notícias com foto</strong>
            </div>
            <div class="game-2026-news-list">${renderNewsItems(context.items)}</div>
          </aside>
          ` : ''}
        </article>
      `;
    } catch (error) {
      console.warn('[games-2026] Fallback card for', game?.title, error?.message || error);
      return renderFallbackCard(game);
    }
  }

  mount.innerHTML = groups.map((group) => {
    const key = portalListKey(group.title);
    return `
      <section class="games-2026-group portal-group">
        <header class="games-2026-group-head portal-group-head">
          <div>
            <h3>${group.title}</h3>
            <p>${group.intro}</p>
          </div>
          <span class="games-2026-count">${group.items.length} títulos</span>
        </header>
        <div class="games-2026-portal-list" data-portal-list="${key}">
          ${group.items.map((game) => skeletonCard(game)).join('')}
        </div>
      </section>
    `;
  }).join('');

  for (const group of groups) {
    const key = portalListKey(group.title);
    const list = mount.querySelector(`[data-portal-list="${key}"]`);
    if (!list) continue;

    const cards = await Promise.all(group.items.map(async (game) => {
      try {
        return await renderGame(game);
      } catch (error) {
        console.warn('[games-2026] Group render fallback for', game?.title, error?.message || error);
        return renderFallbackCard(game);
      }
    }));

    list.innerHTML = cards.join('');
  }
});