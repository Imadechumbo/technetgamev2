# TECHNETGAME V2 — CLAUDE.md
## Documento central do projeto | Criado: 2026-07-04

> **LEIA ESTE ARQUIVO COMPLETO ANTES DE QUALQUER AÇÃO.**
> Este arquivo contém o estado real do projeto — o que está implementado, variáveis de ambiente reais, e decisões de escopo já fechadas.
> Histórico numerado (README_V2_9..14 + docs/15..20, releases V2.9-V2.14) e detalhe de sessões futuras → `CLAUDE_HISTORY.md`.

---

## STACK & URLS

| Componente | URL / Nome | Notas |
|-----------|-----|-------|
| Frontend | https://technetgame.com.br | Cloudflare Pages — deploy via `npx wrangler pages deploy ./front` (workflow `release-auto-rollback.yml`) |
| Backend EB | AWS Elastic Beanstalk — ambiente `Technetgame-env-1` | Node.js, único ambiente de produção (ver Decisões de Escopo) |
| GitHub | https://github.com/Imadechumbo/technetgamev2 | Repositório principal |
| Domínio | technetgame.com.br | DNS aponta pro projeto Cloudflare Pages (confirmado no vision-core CLAUDE.md, mesma investigação de DNS) |

**Deploy (via GitHub Actions, `workflow_dispatch` manual — nenhum dos dois workflows roda automático em push):**
- `release-auto-rollback.yml` — pipeline canônico atual (V2.14): `release_track` (front-only/back-only/full), gates pós-deploy (contract/vitals/mobile/perf), concorrência travada (`concurrency.group`). Chama `scripts/deploy_backend_eb.py` diretamente.
- `deploy-production.yml` — workflow mais antigo (último touch 2026-04-19, um dia antes do V2.14 nascer), não documentado em nenhum README numerado. Chama `scripts/deploy_backend_aws_eb.py` (wrapper — ver Decisões de Escopo, candidato a consolidação na Fase C).
- `validate-prod.yml` — validação pós-deploy.

---

## O QUE ESTÁ IMPLEMENTADO (varrido em `backend/src/app.js` + `backend/src/routes/*.js`, 2026-07-04)

Backend Express (`backend/src/server.js` → `app.js`), CORS por allowlist (`technetgame.com.br` + origens de `ALLOWED_ORIGINS`/`CORS_ORIGIN`), helmet, compression.

| Área | Rotas | Notas |
|---|---|---|
| Health | `GET /`, `GET /health`, `GET /api/health` | Reporta quantos providers de IA têm chave configurada |
| News | `GET /api/news/latest\|featured\|home\|month\|status\|game-search\|category/:slug\|source/:slug`, `POST /api/news/refresh` (auth), `POST /api/news/internal/refresh-news` (auth) | Agregador de notícias, cache por categoria/fonte |
| Meta | `GET /api/meta/categories`, `GET /api/meta/sources` | |
| Media | `GET /api/media/game-image\|hardware-image\|creator-avatar\|debug\|debug/providers`, `POST /api/media/cache/clear\|debug/clear-cache` | Proxy/cache de imagens (Pexels/Pixabay como providers, ver env vars) |
| Hardware | `GET /api/hardware/products` | |
| Games | `GET /api/games/cover`, `POST /api/games/cover/cache/clear` | Capas de jogos |
| AI Copiloto | `/api/v1/*` — chat (`POST /chat`, `/chat/stream`, `/stream`), visão (`/chat/vision`, `/vision`), sessões (`/chat/sessions`, `/chat/:id`), memória (`GET\|DELETE /memory`), auth demo (`/auth/demo`, `/demo`), uploads (`/uploads/attachments`), status OpenClaw (`/system/openclaw-status\|profile\|settings`) | Multi-provider (Groq/OpenAI/OpenRouter/Gemini/DeepSeek/Vision), maior arquivo do backend (`aiService.js`, 1374 linhas, 40 funções) |
| Editorial | `GET /api/editorial/home\|week\|month\|breaking\|agents\|logs`, `POST /api/editorial/refresh` | |
| Hermes (V1) | `GET /api/hermes/status\|live-council\|agents\|:period`, `POST /api/hermes/relearn\|qwen-test\|:period/generate` | Conselho editorial de IA com scoring de agentes (ver env vars `HERMES_AGENT_*`) |
| Hermes V2 | `GET /api/hermes-v2/status`, `POST /api/hermes-v2/run` | |
| Project ingest | `POST /api/v1/chat/project-zip`, `POST /api/v1/chat/attachments` | Upload de zip/anexo pro chat |
| Estático | `express.static` do diretório `site` (se existir) + `/technet-ai`, `/admin-ui`, `/site` | Fallback local — em produção o frontend real é servido via Cloudflare Pages a partir de `front/`, não por este backend |

---

## VARIÁVEIS DE AMBIENTE (nomes via `backend/.env.example` — sem valores; defaults hardcoded confirmados via grep em `backend/src`)

**Núcleo:** `PORT` (default hardcoded `8080`), `NODE_ENV` (default `development`), `HOST`, `SITE_NAME`, `SITE_URL`, `API_URL`, `ALLOWED_ORIGINS`/`CORS_ORIGIN` (default `""` — cai só na allowlist fixa do `app.js`).

**IA — múltiplos providers com fallback em cadeia** (mesmo padrão do `callLLM()` do vision-core): `GROQ_API_KEY` (fallback pra `OPENAI_API_KEY`), `OPENROUTER_API_KEY` (fallback `OPENROUTER_KEY`), `GEMINI_API_KEY` (fallback `GOOGLE_API_KEY`), `DEEPSEEK_API_KEY`, `VISION_API_KEY` (fallback `OPENAI_VISION_API_KEY`) — todos com default `''` se ausente (deploy sobe sem quebrar, só sem aquele provider). `AI_REQUEST_TIMEOUT_MS` (default hardcoded `45000`), `AI_DEFAULT_MODEL`, `AI_FALLBACK_MODEL`, `MAX_VISION_IMAGE_BYTES` (default `8388608` = 8MB).

**Hermes (conselho editorial IA):** `HERMES_ENABLED` (default `'true'`), `HERMES_MODE` (default `'strategic'`), `HERMES_PRIMARY/SECONDARY/TERTIARY_MODEL` com cadeia de fallback própria terminando em modelos hardcoded (`qwen/qwen3.6-plus:free`, `llama-3.3-70b-versatile`, `gemini-2.5-flash`), `HERMES_CRON` (default `'15 */2 * * *'`), `HERMES_NEWS_LIMIT` (default `60` num lugar, `90` em outro — **inconsistência real, não corrigida ainda**), `HERMES_AGENT_SCORING_ENABLED`/`PENALTY_MULTIPLIER`/`RECOVERY_RATE`/`SCORE_DECAY` (scoring de agente com decaimento).

**Segurança:** `REFRESH_TOKEN` (protege `/api/news/refresh`), `ALLOW_LOCAL_REFRESH_WITHOUT_TOKEN` (default `false` no `.env.example` — permite pular o token em dev).

**Cache/imagens:** `CACHE_DIR`, `GAME_COVER_*`, `GAME_NEWS_*`, `IMAGE_*`, `NEWSAPI_KEY`/`NEWSAPI_BASE`, `PEXELS_API_KEY`, `PIXABAY_API_KEY` — todos com default numérico hardcoded (TTLs em ms, page sizes, timeouts).

**Deploy (só existem nos workflows do GitHub Actions, não em `.env.example` — são secrets/vars de CI):** `AWS_EB_APPLICATION`/`AWS_EB_ENVIRONMENT`/`AWS_EB_BUNDLE`/`AWS_EB_S3_BUCKET`/`AWS_EB_S3_KEY`/`AWS_EB_VERSION_LABEL`/`AWS_EB_HEALTH_URL` (usados só por `deploy-production.yml`, via wrapper) vs `AWS_S3_DEPLOY_BUCKET`/`BACKEND_VERSION_LABEL`/`AWS_EB_APPLICATION`/`AWS_EB_ENVIRONMENT` (usados por `release-auto-rollback.yml`, direto no script real) — dois conjuntos parcialmente sobrepostos, ver Decisões de Escopo.

---

## DECISÕES DE ESCOPO / ARQUITETURA (não tocar sem decisão nova)

### AMBIENTE AWS CONSOLIDADO — DECISÃO FECHADA
`Technetgame-env-1` é o único ambiente de produção deste projeto. `TNGH-BACKEND` e `Tngh-aws-final-v2-env` foram encerrados em 2026-07-05 — eram ambientes de teste/duplicata, confirmados e documentados na investigação completa registrada no `CLAUDE.md` do repo vision-core (verificação de DNS, GitHub Actions e Worker gateway antes do terminate). Nenhum script/workflow deste repo (`technetgamev2`) referenciava os ambientes encerrados — confirmado por busca (`tngh-aws-final-v2-env`, zero ocorrências neste repo).

### PAR DE SCRIPTS DE DEPLOY — CONSOLIDADO (Fase C, fechada 2026-07-04)
`scripts/deploy_backend_aws_eb.py` (wrapper de 15 linhas) foi **apagado**. `scripts/deploy_backend_eb.py` agora aceita nativamente os dois conjuntos de nomes de env var (`os.getenv('BACKEND_BUNDLE_PATH') or os.getenv('AWS_EB_BUNDLE')`, mesmo padrão pra bucket/version-label). `deploy-production.yml` atualizado pra chamar `deploy_backend_eb.py` direto — nenhuma outra mudança de trigger/steps nesse workflow. `release-auto-rollback.yml` (pipeline V2.14 canônico) já chamava o script real, não precisou de mudança.

Testado localmente sem deploy real: os dois conjuntos de nomes resolvem corretamente (passam do check de variáveis obrigatórias, falham só no check de bundle inexistente — esperado com bundle fake).

### PAR DE SCRIPTS DE ROLLBACK — MESMA FAMÍLIA, NECESSIDADE NÃO AVALIADA AINDA
`scripts/rollback_backend.py` (17 linhas, genérico — executa o comando template de `ROLLBACK_BACK_CMD` via `release_utils.run_command_template`, chamado por `npm run rollback:back`) + `scripts/rollback_backend_eb.py` (57 linhas, implementação real específica de EB — mesmo padrão de polling/argparse do `deploy_backend_eb.py`, chamado por `npm run backend:rollback:eb` e pelo workflow `release-auto-rollback.yml`). Diferente do par de deploy, este não é wrapper-fino-vs-real — é genérico-templated vs específico-EB. Avaliar se os dois são realmente necessários fica pra quando/se a Fase C for estendida a rollback.

---

## DOCUMENTAÇÃO NUMERADA (Fase D, ainda não decidida)

Duas séries paralelas cobrindo os **mesmos 6 releases** (V2.9 a V2.14), ambas adicionadas no mesmo dia (2026-04-18): raiz `README_V2_9..14_*.txt` (texto plano) e `docs/15..20-v2-*.md` (markdown com headers). Comparação de um par confirmou conteúdo equivalente, só reformatado — duplicação real de manutenção. Nenhuma das 12 entradas tem pendência aberta (100% histórico fechado). Decisão de qual série manter (ou migrar as duas pra dentro de `CLAUDE_HISTORY.md`) ainda não foi tomada — ver `CLAUDE_HISTORY.md` pro registro de quando isso for decidido.

---

## NOTA TÉCNICA — LIMPEZA DE TRACKING GIT (2026-07-04)

`node_modules/` (666 arquivos) e `__pycache__/*.pyc` (10 arquivos) estavam rastreados no git por ausência de regra no `.gitignore` (não é o mesmo bug do vision-core, que era `.gitignore` em UTF-16 com BOM — aqui o arquivo já estava em ASCII/CRLF normal, só faltavam as linhas). Corrigido na Fase B — ver `CLAUDE_HISTORY.md` pro commit exato.
