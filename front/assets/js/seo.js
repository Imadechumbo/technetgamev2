
(() => {
  const SITE_URL = 'https://www.technetgame.com.br';
  const DEFAULT_IMAGE = `${SITE_URL}/assets/img/og-cover.png`;
  const ADSENSE_ID = 'ca-pub-4297152752982122';

  const PAGE_DEFAULTS = {
    'index.html': {
      section: 'home',
      title: 'TechNetGame — tecnologia, hardware, IA, segurança e jogos em tempo real',
      description: 'Portal de tecnologia e hardware com cobertura em tempo real sobre IA, chips, jogos, segurança digital e indústria de tecnologia.'
    },
    'tecnologia.html': {
      section: 'technology',
      title: 'Tecnologia | TechNetGame',
      description: 'Mercado, software, chips, cloud, mobile e plataformas com cobertura contínua em PT-BR.'
    },
    'games.html': {
      section: 'games',
      title: 'Games | TechNetGame',
      description: 'AAA, indie, pré-estreias, engines, comunidade e publishing com cobertura editorial em PT-BR.'
    },
    'hardware.html': {
      section: 'hardware',
      title: 'Hardware | TechNetGame',
      description: 'GPUs, CPUs, notebooks, benchmarks, chips e infraestrutura com foco em performance e mercado.'
    },
    'ia-dados.html': {
      section: 'ai',
      title: 'IA e Dados | TechNetGame',
      description: 'Modelos, agentes, plataformas, dados e infraestrutura de IA com cobertura contínua.'
    },
    'seguranca.html': {
      section: 'security',
      title: 'Segurança | TechNetGame',
      description: 'Cibersegurança, privacidade, vulnerabilidades, golpes e boas práticas para acompanhar riscos em tempo real.'
    },
    'sony.html': {
      section: 'sony',
      title: 'PlayStation e Sony | TechNetGame',
      description: 'Cobertura editorial de PlayStation, estúdios Sony, lançamentos e ecossistema.'
    },
    'microsoft.html': {
      section: 'microsoft',
      title: 'Xbox e Microsoft | TechNetGame',
      description: 'Xbox, Game Pass, estúdios Microsoft, cloud gaming e cobertura da indústria.'
    },
    'nintendo.html': {
      section: 'nintendo',
      title: 'Nintendo | TechNetGame',
      description: 'Nintendo, Switch, first-party, lançamentos e bastidores da plataforma em PT-BR.'
    },
    'valve.html': {
      section: 'valve',
      title: 'Valve e PC Gaming | TechNetGame',
      description: 'Valve, Steam, PC gaming e ecossistema competitivo com leitura editorial em português.'
    },
    'steam-news.html': {
      section: 'steam-news',
      title: 'Steam News | TechNetGame',
      description: 'Atualizações, lançamentos, promoções e movimentos do ecossistema Steam.'
    },
    'steamdb.html': {
      section: 'steamdb',
      title: 'SteamDB Radar | TechNetGame',
      description: 'Radar de tendências, movimentações e sinais do ecossistema SteamDB.'
    },
    'steam-charts.html': {
      section: 'steam-charts',
      title: 'Steam Charts | TechNetGame',
      description: 'Leitura editorial sobre audiência, picos de jogadores e movimentações do Steam Charts.'
    },
    'google.html': {
      section: 'google',
      title: 'Google | TechNetGame',
      description: 'Google, Android, Gemini, busca, cloud e infraestrutura com cobertura contínua.'
    },
    'apple.html': {
      section: 'apple',
      title: 'Apple | TechNetGame',
      description: 'Apple, iPhone, Mac, serviços e ecossistema com leitura editorial em PT-BR.'
    },
    'empresas.html': {
      section: 'companies',
      title: 'Empresas | TechNetGame',
      description: 'Mercado, big tech, resultados, infraestrutura e movimentos estratégicos da indústria.'
    },
    'newsletter.html': {
      section: 'newsletter',
      title: 'Newsletter | TechNetGame',
      description: 'Receba o resumo editorial do TechNetGame com destaques de tecnologia, jogos, IA e segurança.'
    },
    'sobre.html': {
      section: 'about',
      title: 'Sobre o TechNetGame',
      description: 'Conheça a proposta editorial, as fontes abertas e a estrutura do portal TechNetGame.'
    },
    'contato.html': {
      section: 'contact',
      title: 'Contato | TechNetGame',
      description: 'Canal de contato, pauta, parceria e comunicação editorial do TechNetGame.'
    },
    'apoiar-projeto.html': {
      section: 'support',
      title: 'Apoiar o projeto | TechNetGame',
      description: 'Apoie o TechNetGame e fortaleça um portal editorial independente focado em tecnologia e jogos.'
    },
    'politica-de-privacidade.html': {
      section: 'privacy',
      title: 'Política de Privacidade | TechNetGame',
      description: 'Saiba como tratamos dados, cookies e privacidade no TechNetGame.'
    },
    'termos-de-uso.html': {
      section: 'terms',
      title: 'Termos de Uso | TechNetGame',
      description: 'Termos de uso e regras gerais de navegação do portal TechNetGame.'
    },
    'automacao-rss-api.html': {
      section: 'automation',
      title: 'Automação RSS e API | TechNetGame',
      description: 'Entenda a base de automação editorial, feeds, cache e API do TechNetGame.'
    },
    'valve-pre-estreias.html': {
      section: 'valve-pre-estreias',
      title: 'Valve e pré-estreias | TechNetGame',
      description: 'Pré-estreias, wishlists, demos e lançamentos relevantes do ecossistema Valve.'
    }
  };

  function pathnameToFile() {
    const p = window.location.pathname.replace(/^\/+/, '');
    if (!p || p.endsWith('/')) return 'index.html';
    return p;
  }

  function absoluteUrl(pathOrUrl = '') {
    try {
      return new URL(pathOrUrl, SITE_URL).toString();
    } catch {
      return SITE_URL;
    }
  }

  function getMetaDescription() {
    const el = document.querySelector('meta[name="description"]');
    return el?.content?.trim() || '';
  }

  function upsertMeta(attr, key, value) {
    if (!value) return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', value);
  }

  function upsertLink(rel, href) {
    if (!href) return;
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  }

  function setJsonLd(id, obj) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(obj);
  }

  function cleanText(value = '') {
    return String(value).replace(/\s+/g, ' ').trim();
  }

  function inferSection(file) {
    return (PAGE_DEFAULTS[file] || PAGE_DEFAULTS['index.html']).section;
  }

  function applySeo(payload = {}) {
    const file = pathnameToFile();
    const defaults = PAGE_DEFAULTS[file] || PAGE_DEFAULTS['index.html'];
    const canonical = file === 'index.html' ? `${SITE_URL}/` : `${SITE_URL}/${file}`;
    const title = cleanText(payload.title || defaults.title || document.title);
    const description = cleanText(payload.description || getMetaDescription() || defaults.description);
    const image = absoluteUrl(payload.image || DEFAULT_IMAGE);
    const section = payload.section || defaults.section || inferSection(file);

    document.title = title;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    upsertMeta('name', 'google-adsense-account', ADSENSE_ID);
    upsertMeta('property', 'og:type', payload.ogType || (file === 'index.html' ? 'website' : 'article'));
    upsertMeta('property', 'og:site_name', 'TechNetGame');
    upsertMeta('property', 'og:locale', 'pt_BR');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:alt', cleanText(payload.imageAlt || title));
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
    upsertMeta('name', 'twitter:image:alt', cleanText(payload.imageAlt || title));
    upsertMeta('name', 'twitter:site', '@technetgame');
    upsertLink('canonical', canonical);

    const org = {
      "@context": "https://schema.org",
      "@type": "NewsMediaOrganization",
      "name": "TechNetGame",
      "url": SITE_URL,
      "logo": {
        "@type": "ImageObject",
        "url": `${SITE_URL}/assets/img/og-cover.png`
      },
      "sameAs": [SITE_URL]
    };
    setJsonLd('seo-org', org);

    const website = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "TechNetGame",
      "url": SITE_URL,
      "inLanguage": "pt-BR",
      "publisher": {
        "@type": "Organization",
        "name": "TechNetGame"
      }
    };
    setJsonLd('seo-website', website);

    const pageSchema = payload.article ? {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "headline": title,
      "description": description,
      "datePublished": payload.publishedAt || new Date().toISOString(),
      "dateModified": payload.modifiedAt || payload.publishedAt || new Date().toISOString(),
      "image": [image],
      "mainEntityOfPage": canonical,
      "inLanguage": "pt-BR",
      "articleSection": section,
      "author": {
        "@type": "Organization",
        "name": payload.source || "TechNetGame"
      },
      "publisher": {
        "@type": "Organization",
        "name": "TechNetGame",
        "logo": {
          "@type": "ImageObject",
          "url": `${SITE_URL}/assets/img/og-cover.png`
        }
      }
    } : {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": title,
      "description": description,
      "url": canonical,
      "inLanguage": "pt-BR",
      "isPartOf": {
        "@type": "WebSite",
        "name": "TechNetGame",
        "url": SITE_URL
      },
      "about": section
    };
    setJsonLd('seo-page', pageSchema);
  }

  async function applyHomeHeroSeo() {
    if (pathnameToFile() !== 'index.html') {
      applySeo();
      return;
    }

    applySeo();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(window.tngApiUrl('/api/news/latest?limit=1'), { signal: controller.signal, headers: { Accept: 'application/json' } });
      clearTimeout(timeout);
      if (!res.ok) return;
      const payload = await res.json();
      const hero = payload?.hero || (Array.isArray(payload?.items) ? payload.items[0] : null) || (Array.isArray(payload?.latest) ? payload.latest[0] : null);
      if (!hero) return;

      const heroTitle = cleanText(hero.title || '');
      const source = cleanText(hero.source || 'TechNetGame');
      const summary = cleanText(hero.summary || hero.description || '');
      const title = heroTitle ? `${heroTitle} | TechNetGame` : document.title;
      const desc = summary || getMetaDescription();
      applySeo({
        title,
        description: desc,
        image: hero.image || hero.imageFallback || DEFAULT_IMAGE,
        imageAlt: heroTitle || title,
        article: true,
        publishedAt: hero.publishedAt,
        modifiedAt: payload.generatedAt || hero.publishedAt,
        section: hero.category || 'home',
        source,
        ogType: 'article'
      });
    } catch (err) {
      // Mantém SEO estático em caso de falha.
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await (window.__TNG_CONFIG_READY__ || Promise.resolve());
    } catch {}
    applyHomeHeroSeo();
  });
})();
