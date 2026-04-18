window.TechNetGameFeeds = {
    fallbackPool: [
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1603481546238-487240415921?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80'
    ],

    globalUsedImages: new Set(),
    globalUsedItems: new Set(),
    homePayloadPromise: null,
    monthPayloadPromise: null,

    getApiCandidates() {
        const cfg = window.RUNTIME_CONFIG || {};
        const primary =
            cfg.API_BASE_URL ||
            cfg.API_URL ||
            cfg.API_BASE ||
            window.__TNG_API_BASE__ ||
            '';

        const fallbacks = Array.isArray(cfg.API_FALLBACKS) ? cfg.API_FALLBACKS : [];

        return [primary, ...fallbacks]
            .map((value) => String(value || '').trim().replace(/\/$/, ''))
            .filter(Boolean)
            .filter((value, index, arr) => arr.indexOf(value) === index);
    },

    getApiBase() {
        return this.getApiCandidates()[0] || '';
    },

    buildApiUrl(path = '', baseOverride = '') {
        const raw = String(path || '').trim();
        if (!raw) return String(baseOverride || this.getApiBase() || '').replace(/\/$/, '');
        if (/^https?:\/\//i.test(raw)) return raw;

        const base = String(baseOverride || this.getApiBase() || '').replace(/\/$/, '');
        const cleanPath = raw.startsWith('/') ? raw : `/${raw}`;
        return `${base}${cleanPath}`;
    },

    async fetchJson(url) {
        const candidates = /^https?:\/\//i.test(String(url || '').trim())
            ? [String(url).trim()]
            : this.getApiCandidates().map((base) => this.buildApiUrl(url, base));

        let lastError = null;

        for (const finalUrl of candidates) {
            try {
                console.log('API CALL:', finalUrl);

                const response = await fetch(finalUrl, {
                    headers: {
                        Accept: 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`Falha ao buscar API: ${response.status} em ${finalUrl}`);
                }

                return await response.json();
            } catch (error) {
                lastError = error;
                console.warn('TechNetGame API fallback:', finalUrl, error);
            }
        }

        throw lastError || new Error('Falha ao buscar API em todos os endpoints');
    },

    async fetchHomePayloadFallback() {
        const [
            latestResult,
            techResult,
            gamesResult,
            hardwareResult,
            securityResult,
            aiResult
        ] = await Promise.allSettled([
            this.fetchJson('/api/news/latest?limit=18'),
            this.fetchJson('/api/news/category/technology?limit=18'),
            this.fetchJson('/api/news/category/games?limit=18'),
            this.fetchJson('/api/news/category/hardware?limit=18'),
            this.fetchJson('/api/news/category/security?limit=18'),
            this.fetchJson('/api/news/category/ai?limit=18')
        ]);

        const latestPayload = latestResult.status === 'fulfilled' ? latestResult.value : { items: [] };
        const techPayload = techResult.status === 'fulfilled' ? techResult.value : { items: [] };
        const gamesPayload = gamesResult.status === 'fulfilled' ? gamesResult.value : { items: [] };
        const hardwarePayload = hardwareResult.status === 'fulfilled' ? hardwareResult.value : { items: [] };
        const securityPayload = securityResult.status === 'fulfilled' ? securityResult.value : { items: [] };
        const aiPayload = aiResult.status === 'fulfilled' ? aiResult.value : { items: [] };

        const latestItems = this.normalizeApiItems(latestPayload, 'Últimas notícias');
        const techItems = this.normalizeApiItems(techPayload, 'Tecnologia');
        const gamesItems = this.normalizeApiItems(gamesPayload, 'Games');
        const hardwareItems = this.normalizeApiItems(hardwarePayload, 'Hardware');
        const securityItems = this.normalizeApiItems(securityPayload, 'Segurança');
        const aiItems = this.normalizeApiItems(aiPayload, 'IA');

        return {
            hero:
                latestItems[0] ||
                techItems[0] ||
                gamesItems[0] ||
                hardwareItems[0] ||
                securityItems[0] ||
                aiItems[0] ||
                null,
            latest: latestItems,
            categories: {
                technology: techItems,
                games: gamesItems,
                hardware: hardwareItems,
                security: securityItems,
                ai: aiItems
            },
            generatedAt:
                latestPayload?.generatedAt ||
                techPayload?.generatedAt ||
                gamesPayload?.generatedAt ||
                hardwarePayload?.generatedAt ||
                securityPayload?.generatedAt ||
                aiPayload?.generatedAt ||
                new Date().toISOString()
        };
    },

    async getHomePayload() {
        if (!this.homePayloadPromise) {
            this.homePayloadPromise = this.fetchJson('/api/news/home')
                .then((payload) => ({
                    hero: payload?.hero || null,
                    latest: Array.isArray(payload?.latest) ? payload.latest : [],
                    categories: {
                        technology: Array.isArray(payload?.technology) ? payload.technology : [],
                        games: Array.isArray(payload?.games) ? payload.games : [],
                        hardware: Array.isArray(payload?.hardware) ? payload.hardware : [],
                        security: Array.isArray(payload?.security) ? payload.security : [],
                        ai: Array.isArray(payload?.ai) ? payload.ai : []
                    },
                    generatedAt: payload?.generatedAt || new Date().toISOString(),
                    highlights: Array.isArray(payload?.highlights) ? payload.highlights : []
                }))
                .catch(async (error) => {
                    console.warn('TechNetGame home endpoint fallback:', error);
                    try {
                        return await this.fetchHomePayloadFallback();
                    } catch (fallbackError) {
                        this.homePayloadPromise = null;
                        throw fallbackError;
                    }
                });
        }
        return this.homePayloadPromise;
    },

    async getMonthPayload() {
        if (!this.monthPayloadPromise) {
            this.monthPayloadPromise = this.fetchJson('/api/news/latest?limit=24')
                .then((payload) => {
                    const items = this.normalizeApiItems(payload, 'Mês');
                    return {
                        hero: items[0] || null,
                        items,
                        latest: items,
                        generatedAt: payload?.generatedAt || new Date().toISOString()
                    };
                })
                .catch((error) => {
                    this.monthPayloadPromise = null;
                    throw error;
                });
        }
        return this.monthPayloadPromise;
    },

    translateToPT(text = '') {
        if (!text) return '';
        let output = String(text).trim();

        const replacements = [
            [/^A Brief Overview of\s+/i, 'Uma visão geral de '],
            [/^An Introduction to\s+/i, 'Uma introdução a '],
            [/^Introduction to\s+/i, 'Introdução a '],
            [/^Designing\s+/i, 'Criando '],
            [/\bappeared first on\b/gi, 'apareceu primeiro em'],
            [/\bexpert tips and tricks\b/gi, 'dicas e truques especializadas'],
            [/\bthe biggest game modes\b/gi, 'os maiores modos de jogo'],
            [/\bbrief overview\b/gi, 'visão geral'],
            [/\boverview\b/gi, 'visão geral'],
            [/\bintroduction\b/gi, 'introdução'],
            [/\bnews\b/gi, 'notícias'],
            [/\bupdate\b/gi, 'atualização'],
            [/\bupdates\b/gi, 'atualizações'],
            [/\brelease\b/gi, 'lançamento'],
            [/\breleased\b/gi, 'lançado'],
            [/\blaunch\b/gi, 'lançamento'],
            [/\blaunches\b/gi, 'lança'],
            [/\bnew\b/gi, 'novo'],
            [/\bgames\b/gi, 'jogos'],
            [/\bgame\b/gi, 'jogo'],
            [/\bdeveloper\b/gi, 'desenvolvedor'],
            [/\bdevelopers\b/gi, 'desenvolvedores'],
            [/\bwith\b/gi, 'com'],
            [/\band\b/gi, 'e'],
            [/\bfor\b/gi, 'para'],
            [/\bsecurity\b/gi, 'segurança'],
            [/\bhardware\b/gi, 'hardware'],
            [/\bcloud\b/gi, 'nuvem'],
            [/\bthe post\b/gi, 'a publicação'],
            [/\bthe update\b/gi, 'a atualização'],
            [/\bcontains multiple vulnerabilities\b/gi, 'contém múltiplas vulnerabilidades'],
            [/\bcould allow an attacker to\b/gi, 'pode permitir que um invasor'],
            [/\bthe following versions are affected\b/gi, 'as seguintes versões foram afetadas'],
            [/\btechnical details\b/gi, 'detalhes técnicos'],
            [/\bview csaf summary\b/gi, 'veja o resumo CSAF'],
            [/\bview\b/gi, 'veja'],
            [/\bsummary\b/gi, 'resumo']
        ];

        replacements.forEach(([pattern, value]) => {
            output = output.replace(pattern, value);
        });

        return output.replace(/\s{2,}/g, ' ').trim();
    },

    isValidImage(url = '') {
        if (!url) return false;
        const lower = String(url).toLowerCase();
        const badPatterns = [
            'avatar',
            'default',
            'blank',
            'placeholder',
            'no-image',
            'noimage',
            'gravatar',
            'missing',
            'fallback-user',
            'us_flag_small',
            '.mp4',
            '.webm',
            '.mov',
            '.avi',
            '.m3u8',
            '.svg'
        ];
        return !badPatterns.some((pattern) => lower.includes(pattern));
    },

    localNewsMap: {
        'openai-proposta-proteger-trabalhadores-gera-desconfianca': '/news/openai-proposta-proteger-trabalhadores-gera-desconfianca.html',
        'cloudflare-rede-global-seguranca-infraestrutura-internet': '/news/cloudflare-rede-global-seguranca-infraestrutura-internet.html',
        'anthropic-mythos-vazamento-riscos-ciberseguranca': '/news/anthropic-mythos-vazamento-riscos-ciberseguranca.html'
    },

    normalizeNewsUrl(url = '', title = '') {
        const rawUrl = String(url || '').trim();
        const rawTitle = String(title || '').trim();
        const knownTitleMap = {
            'openai propõe proteção a trabalhadores — mas levanta suspeitas no mercado': this.localNewsMap['openai-proposta-proteger-trabalhadores-gera-desconfianca'],
            'cloudflare consolida domínio na segurança e infraestrutura da internet': this.localNewsMap['cloudflare-rede-global-seguranca-infraestrutura-internet'],
            'vazamento de modelo da anthropic acende alerta global de cibersegurança': this.localNewsMap['anthropic-mythos-vazamento-riscos-ciberseguranca']
        };

        const normalizedTitle = rawTitle.toLowerCase();
        if (knownTitleMap[normalizedTitle]) {
            return knownTitleMap[normalizedTitle];
        }

        if (!rawUrl) return '#';

        try {
            const parsed = new URL(rawUrl, window.location.origin);
            const isSameOrigin = parsed.origin === window.location.origin;
            const isTechNetGame = /(^|\.)technetgame\.com\.br$/i.test(parsed.hostname);
            const pathname = parsed.pathname.replace(/\/+/g, '/');

            if ((isSameOrigin || isTechNetGame) && pathname.toLowerCase().startsWith('/news/')) {
                const cleanPath = pathname.replace(/\/+$|\.html$/i, '');
                const slug = cleanPath.split('/').filter(Boolean).pop() || '';
                if (this.localNewsMap[slug]) {
                    return this.localNewsMap[slug];
                }
                return `${cleanPath}.html`;
            }

            return parsed.toString();
        } catch {
            if (/^\/news\//i.test(rawUrl)) {
                const cleanPath = rawUrl.replace(/\/+$|\.html$/i, '');
                const slug = cleanPath.split('/').filter(Boolean).pop() || '';
                if (this.localNewsMap[slug]) {
                    return this.localNewsMap[slug];
                }
                return `${cleanPath}.html`;
            }
            return rawUrl;
        }
    },

    normalizeApiItems(payload, defaultSource = 'Fonte aberta') {
        const rawItems = Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []);
        return rawItems.map((item, index) => ({
            id: item.id || `${item.url || item.link || defaultSource}-${index}`,
            title: item.title || 'Sem título',
            url: this.normalizeNewsUrl(item.url || item.link || '#', item.title || ''),
            summary: item.summary || item.description || 'Leia a matéria completa na fonte.',
            source: item.source || defaultSource,
            sourceSlug: item.sourceSlug || '',
            category: item.category || 'geral',
            categoryLabel: item.categoryLabel || item.category || 'Geral',
            publishedAt: item.publishedAt || item.date || item.pubDate || '',
            image: this.isValidImage(item.image) ? item.image : (this.isValidImage(item.imageFallback) ? item.imageFallback : ''),
            imageFallback: this.isValidImage(item.imageFallback) ? item.imageFallback : '',
            priority: item.priority || 'latest',
            relevanceScore: item.relevanceScore || 0,
            sourceQualityScore: item.sourceQualityScore || 0,
            translationScore: item.translationScore || 0
        }));
    },

    formatDate(value) {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return 'Agora';
        return parsed.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    normalizeTitle(value = '') {
        return String(value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/\b(the|a|an|of|for|with|and|to|on|in|de|da|do|das|dos|para|com|uma|um|o|a|as|os)\b/g, '-')
            .replace(/\b(update|atualizacao|release|lancamento|launch|news|noticias|official|oficial|trailer|beta|patch|guide|guia|overview|visao-geral|brief|resumo)\b/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    normalizeImageFingerprint(url = '') {
        if (!url) return '';
        try {
            const parsed = new URL(String(url), window.location.origin);
            const normalizedPath = parsed.pathname
                .replace(/\\/g, '/')
                .replace(/[-_]?\d{2,4}x\d{2,4}(?=\.[a-z0-9]+$)/gi, '')
                .replace(/[-_](thumb|thumbnail|small|medium|large|preview|og|social)(?=\.[a-z0-9]+$)/gi, '');
            const filename = normalizedPath.split('/').filter(Boolean).pop() || normalizedPath;
            return `${parsed.hostname}/${filename}`.toLowerCase();
        } catch {
            return String(url).split('?')[0].toLowerCase();
        }
    },

    buildTitleFingerprint(item) {
        return `${item.sourceSlug || item.category || 'geral'}-${this.normalizeTitle(item.title).slice(0, 90)}`;
    },

    getFallbackForGrid(seed = '') {
        const chars = Array.from(String(seed));
        const start = Math.abs(chars.reduce((acc, char) => acc + char.charCodeAt(0), 0)) % this.fallbackPool.length;

        for (let i = 0; i < this.fallbackPool.length; i += 1) {
            const candidate = this.fallbackPool[(start + i) % this.fallbackPool.length];
            const fingerprint = this.normalizeImageFingerprint(candidate);
            if (!this.globalUsedImages.has(fingerprint)) {
                this.globalUsedImages.add(fingerprint);
                return candidate;
            }
        }

        return this.fallbackPool[start];
    },

    pickUniqueImageForGrid(item) {
        const candidates = [item.image, item.imageFallback].filter(Boolean);

        for (const candidate of candidates) {
            const fingerprint = this.normalizeImageFingerprint(candidate);
            if (!fingerprint) continue;
            if (this.globalUsedImages.has(fingerprint)) continue;
            this.globalUsedImages.add(fingerprint);
            return candidate;
        }

        return this.getFallbackForGrid(item.title || item.id || 'fallback');
    },

    decorateItems(items = [], localUsedItems = new Set()) {
        const output = [];
        for (const item of items) {
            const urlKey = (item.url || '').toLowerCase().trim().replace(/\?.*$/, '');
            const titleFingerprint = this.buildTitleFingerprint(item);

            if (urlKey && (localUsedItems.has(urlKey) || this.globalUsedItems.has(urlKey))) continue;
            if (titleFingerprint && (localUsedItems.has(titleFingerprint) || this.globalUsedItems.has(titleFingerprint))) continue;

            if (urlKey) {
                localUsedItems.add(urlKey);
                this.globalUsedItems.add(urlKey);
            }
            if (titleFingerprint) {
                localUsedItems.add(titleFingerprint);
                this.globalUsedItems.add(titleFingerprint);
            }

            output.push({ ...item, image: this.pickUniqueImageForGrid(item) });
        }
        return output;
    },

    buildImgTag(item, className = '') {
        const fallback = item.imageFallback || this.getFallbackForGrid(item.title || item.id || 'fallback');
        const safeAlt = String(item.title || 'Imagem da notícia').replace(/"/g, '&quot;');
        return `<img class="${className}" src="${item.image}" alt="${safeAlt}" loading="lazy" onerror="if(this.dataset.fallbackApplied==='1'){this.remove();return;}this.dataset.fallbackApplied='1';this.src='${fallback}'">`;
    },

    renderNewsCard(item) {
        return `
      <article class="news-card-unified">
        <a class="news-card-media-unified" href="${item.url}" target="_blank" rel="noopener">
          ${this.buildImgTag(item)}
        </a>
        <div class="news-card-body-unified">
          <div class="news-card-chip-row">
            <span class="news-card-chip">${item.source || 'Fonte aberta'}</span>
            <span class="news-card-chip">${item.priority === 'hero' ? 'Destaque' : item.priority === 'highlight' ? 'Em alta' : item.categoryLabel || item.category || 'Geral'}</span>
            ${item.sourceQualityScore >= 90 ? '<span class="news-card-chip">Fonte forte</span>' : ''}
          </div>
          <h3><a href="${item.url}" target="_blank" rel="noopener">${item.title}</a></h3>
          <p>${item.summary || 'Leia a cobertura completa na fonte.'}</p>
          <div class="news-card-meta-unified">
            <span>${String(item.categoryLabel || item.category || 'geral')}</span>
            <span>${this.formatDate(item.publishedAt)}</span>
          </div>
        </div>
      </article>
    `;
    },

    resolveBlockContainer(target) {
        if (!target) return null;
        return target.closest('[data-feed-block]')
            || target.closest('.section-block')
            || target.closest('section')
            || target.parentElement
            || null;
    },

    hideEmptyContainer(target) {
        const container = this.resolveBlockContainer(target);
        if (!container) return;

        container.classList.add('feed-block-collapsing');

        window.setTimeout(() => {
            container.hidden = true;
            container.classList.remove('feed-block-collapsing');
        }, 260);
    },

    showContainer(target) {
        const container = this.resolveBlockContainer(target);
        if (!container) return;
        container.hidden = false;
        container.classList.remove('feed-block-collapsing');
    },

    renderNewsGrid(target, items = [], limit = 12) {
        if (!target) return false;
        const localUsedItems = new Set();
        const decorated = this.decorateItems(items, localUsedItems).slice(0, limit);

        if (!decorated.length) {
            target.innerHTML = '';
            this.hideEmptyContainer(target);
            return false;
        }

        target.innerHTML = decorated.map((item) => this.renderNewsCard(item)).join('');
        this.showContainer(target);
        document.dispatchEvent(new CustomEvent('technet:feed-grid-rendered', { detail: { api: target.dataset.api || '', label: target.dataset.label || '', count: decorated.length, items: decorated } }));
        return true;
    },

    renderFeaturedSmart(container, item) {
        if (!container || !item) return;
        container.innerHTML = `
      <article class="featured-smart-card">
        <a class="featured-smart-media" href="${item.url}" target="_blank" rel="noopener">
          ${this.buildImgTag(item, 'featured-smart-image')}
        </a>
        <div class="featured-smart-body">
          <span class="featured-smart-badge">${item.priority === 'hero' ? 'Destaque principal' : (item.source || 'Destaque')}</span>
          <h3><a href="${item.url}" target="_blank" rel="noopener">${item.title}</a></h3>
          <p>${item.summary || 'Leia a matéria completa na fonte.'}</p>
          <div class="featured-smart-meta">
            <span>${String(item.categoryLabel || item.category || 'geral')}</span>
            <span>${this.formatDate(item.publishedAt)}</span>
          </div>
        </div>
      </article>
    `;
    },

    async hydrateFeaturedSmart() {
        const container = document.querySelector('[data-featured-smart]');
        if (!container) return;

        try {
            const payload = await this.getHomePayload();
            const hero = payload?.hero ? this.normalizeApiItems({ items: [payload.hero] }, 'Destaque')[0] : null;
            if (!hero) throw new Error('hero-missing');

            this.renderFeaturedSmart(container, {
                ...hero,
                image: this.pickUniqueImageForGrid(hero)
            });
        } catch (error) {
            container.innerHTML = '<div class="featured-smart-status">Não foi possível carregar o destaque agora.</div>';
            console.error('TechNetGame destaque:', error);
        }
    },

    async hydrateMonthFeatured() {
        const container = document.querySelector('[data-month-featured]');
        if (!container) return;

        try {
            const payload = await this.getMonthPayload();
            const hero = payload?.hero ? this.normalizeApiItems({ items: [payload.hero] }, 'Mês')[0] : null;
            if (!hero) throw new Error('month-hero-missing');

            this.renderFeaturedSmart(container, {
                ...hero,
                image: this.pickUniqueImageForGrid(hero),
                priority: 'hero',
                categoryLabel: 'Mês'
            });

            const badge = container.querySelector('.featured-smart-badge');
            if (badge) badge.textContent = 'Melhor do mês';
        } catch (error) {
            container.innerHTML = '<div class="featured-smart-status">Não foi possível carregar o destaque do mês agora.</div>';
            console.error('TechNetGame mês:', error);
        }
    },

    resolveHomeItemsFromPayload(payload, api) {
        if (!payload) return [];
        const normalizedApi = String(api || '').toLowerCase();

        if (normalizedApi.includes('/api/news/latest')) {
            return this.normalizeApiItems({ items: payload.latest || [] }, 'Últimas notícias');
        }
        if (normalizedApi.includes('/api/news/category/technology')) {
            return this.normalizeApiItems({ items: payload.categories?.technology || [] }, 'Tecnologia');
        }
        if (normalizedApi.includes('/api/news/category/games')) {
            return this.normalizeApiItems({ items: payload.categories?.games || [] }, 'Games');
        }
        if (normalizedApi.includes('/api/news/category/hardware')) {
            return this.normalizeApiItems({ items: payload.categories?.hardware || [] }, 'Hardware');
        }
        if (normalizedApi.includes('/api/news/category/security')) {
            return this.normalizeApiItems({ items: payload.categories?.security || [] }, 'Segurança');
        }
        if (normalizedApi.includes('/api/news/category/ai')) {
            return this.normalizeApiItems({ items: payload.categories?.ai || [] }, 'IA & Dados');
        }

        return [];
    },

    async hydrateHomePage() {
        try {
            const payload = await this.getHomePayload();
            const grids = Array.from(document.querySelectorAll('[data-news-grid]'));

            for (const grid of grids) {
                const api = grid.dataset.api || '';
                const limit = parseInt(grid.dataset.limit || '12', 10);
                const status = grid.parentElement?.querySelector('[data-grid-status]');
                let items = this.resolveHomeItemsFromPayload(payload, api);

                if (!items.length) {
                    try {
                        const fallbackPayload = await this.fetchJson(api);
                        items = this.normalizeApiItems(fallbackPayload, grid.dataset.label || 'Fonte aberta');
                    } catch (fallbackError) {
                        console.error('TechNetGame home fallback:', fallbackError);
                    }
                }

                const hasItems = this.renderNewsGrid(grid, items, limit);
                if (status) {
                    status.textContent = hasItems
                        ? `Atualizado em ${this.formatDate(payload.generatedAt || new Date().toISOString())}`
                        : '';
                }
            }
        } catch (error) {
            console.error('TechNetGame home:', error);
            const grids = Array.from(document.querySelectorAll('[data-news-grid]'));
            for (const grid of grids) {
                await this.hydrateGrid(grid);
            }
        }
    },

    async hydrateGrid(target) {
        const api = target.dataset.api;
        const limit = parseInt(target.dataset.limit || '12', 10);
        const source = target.dataset.label || 'Fonte aberta';
        const status = target.parentElement?.querySelector('[data-grid-status]');
        if (!api) return;

        if (status) status.textContent = 'Carregando...';
        document.dispatchEvent(new CustomEvent('technet:feed-grid-loading', { detail: { api, label: source } }));

        try {
            const payload = await this.fetchJson(api);
            const items = this.normalizeApiItems(payload, source);
            const hasItems = this.renderNewsGrid(target, items, limit);
            if (status) {
                status.textContent = hasItems
                    ? `Atualizado em ${this.formatDate(payload.generatedAt || new Date().toISOString())}`
                    : '';
            }
        } catch (error) {
            target.innerHTML = '';
            this.hideEmptyContainer(target);
            if (status) status.textContent = '';
            document.dispatchEvent(new CustomEvent('technet:feed-grid-error', { detail: { api, label: source, error: String(error?.message || error || 'erro') } }));
            console.error('TechNetGame grid:', error);
        }
    },

    async renderFeedBlock(block) {
        const grid = block.querySelector('[data-feed-list]');
        const status = block.querySelector('[data-feed-status]');
        const sourceName = block.dataset.feedLabel || 'Fonte aberta';
        const apiUrl = block.dataset.feedApi || '';
        const limit = parseInt(block.dataset.feedLimit || '6', 10);
        if (!grid) return;

        grid.classList.add('news-wall-grid');
        if (status) status.textContent = 'Carregando...';
        document.dispatchEvent(new CustomEvent('technet:feed-grid-loading', { detail: { api, label: source } }));

        try {
            const payload = await this.fetchJson(apiUrl);
            const items = this.normalizeApiItems(payload, sourceName);
            const hasItems = this.renderNewsGrid(grid, items, limit);
            if (status) {
                status.textContent = hasItems
                    ? `Atualizado em ${this.formatDate(payload.generatedAt || new Date().toISOString())}`
                    : '';
            }
        } catch (error) {
            grid.innerHTML = '';
            this.hideEmptyContainer(grid);
            if (status) status.textContent = '';
            console.error('TechNetGame bloco:', error);
        }
    },

    isHomePage() {
        const pathname = (window.location.pathname || '/').toLowerCase();
        return pathname === '/' || pathname.endsWith('/index.html');
    },

    async init() {
        this.globalUsedImages.clear();
        this.globalUsedItems.clear();

        await this.hydrateFeaturedSmart();
        await this.hydrateMonthFeatured();

        if (this.isHomePage()) {
            await this.hydrateHomePage();
        } else {
            const grids = document.querySelectorAll('[data-news-grid]');
            for (const grid of grids) {
                await this.hydrateGrid(grid);
            }
        }

        const blocks = document.querySelectorAll('[data-feed-block]');
        for (const block of blocks) {
            await this.renderFeedBlock(block);
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await (window.__TNG_CONFIG_READY__ || Promise.resolve());
    } catch { }
    window.TechNetGameFeeds?.init();
});