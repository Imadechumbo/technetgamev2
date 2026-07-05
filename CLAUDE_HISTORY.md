# TECHNETGAME V2 — CLAUDE_HISTORY.md
## Histórico detalhado de sessões | Criado: 2026-07-04

> Write-up completo (causa raiz, fix, evidência) de cada sessão. O `CLAUDE.md` traz só o estado atual — aqui fica o "porquê" e o "como" de cada mudança, em ordem cronológica.
>
> As 12 entradas numeradas que existiam antes (`README_V2_9..14_*.txt` na raiz + `docs/15..20-v2-*.md`) foram migradas pra este arquivo na Fase D (2026-07-04, ver seções `V2.9`–`V2.14` abaixo) e os 12 arquivos originais foram apagados — esta é agora a única fonte de verdade desse período.

---

## V2.9 (2026-04-18) — SDDF Enforced Engine

Bloqueia release sem governança mínima. Exige 4 arquivos obrigatórios por release (`release/CHANGE_REQUEST.md`, `SPEC.md`, `TEST_PLAN.md`, `ROLLBACK_PLAN.md`), trilha válida em SPEC (reprova SPEC que mistura áreas), mobile validation PASS e UI diff PASS antes de promover. Fluxo: `npm install` → `npx playwright install chromium` → `node ui/capture_ui.mjs` → `update_baseline.mjs` → `python safe_update.py --mode full` → `node panel/server.mjs`.

## V2.10 (2026-04-18) — Auto Heal + Cloudflare Purge + Mobile Hard Lock

Adiciona purge de cache Cloudflare automático após deploy do frontend, mobile validation vira hard-lock (precisa PASS antes de promoção), validação pós-deploy das URLs reais de produção, e rollback automático de front/back em caso de falha. Novos secrets: `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN`, `FRONTEND_PROD_URL`, `API_PROD_HEALTH_URL`, `AWS_EB_HEALTH_URL`.

## V2.11 (2026-04-18) — Intelligent Diff + Performance Guard

Diff visual passa a ignorar diferenças triviais (warning só pra mudanças moderadas, fail só pra regressão visual relevante — reduz falso positivo). Performance guard novo mede `domcontentloaded`/`load`/request count por página e bloqueia regressão de carga. Saídas em `reports/json/ui_diff_latest.json` e `perf_validation_latest.json`.

## V2.12 (2026-04-18) — Pro Completo

Pacote de gates de qualidade: Web Vitals hard-block (LCP > 2500ms ou CLS > 0.1 falham a release), Contract API Lock (valida schema/valores críticos de `/api/health`), JS Runtime Guard (erros de console/`pageerror`/`unhandledrejection` entram na análise), score final unificado no gate e no dashboard, hardening do probe Python (TLS explícito + classificação `TOOLING_ERROR`).

## V2.13 (2026-04-18) — Auto-Rollback Release

Orquestrador de deploy com rollback automático real: registra a última release estável (`npm run stable:record`) antes de publicar a candidata, depois `npm run release:auto` faz deploy controlado de front+back, valida produção, e reverte pra release estável se qualquer gate crítico falhar (rota crítica fora de 200, health fora de 200, contrato FAIL, runtime error, referência JS quebrada). Comandos de deploy/rollback reais injetados via env var com templates (`{front_zip}`, `{stable_back_zip}`, etc.) — rollback só é automático se esses comandos estiverem configurados. Estados finais: `PASS`/`WARNING`/`ROLLED_BACK`/`MANUAL_INTERVENTION_REQUIRED`.

## V2.14 (2026-04-18/19) — GitHub Actions Auto Deploy + Rollback

Move o orquestrador do V2.13 (que rodava local, via `npm run`) pra dentro do GitHub Actions: workflow manual (`workflow_dispatch`) com trilhas `front-only`/`back-only`/`full`, deploy de frontend via Wrangler/Cloudflare Pages, purge Cloudflare após deploy e após rollback, deploy de backend via AWS CLI + Elastic Beanstalk (`deploy_backend_eb.py`), rollback de backend por version label estável (`rollback_backend_eb.py`), e um segundo workflow separado (`validate-prod.yml`) só de validação contínua. Esse é o pipeline (`release-auto-rollback.yml`) confirmado como o canônico atual na Fase C (2026-07-04) — mais completo e mais recente que `deploy-production.yml`, que ficou como workflow legado equivalente mas não documentado em nenhuma dessas 6 entradas.

---

## 2026-07-04 — Diagnóstico geral (ponytail-audit) + criação deste documento

Auditoria completa do repositório nos mesmos 3 ângulos usados no vision-core (tamanho em disco/git, segredos rastreados por engano, complexidade/duplicação) + documentação. Achados principais:

- **277M de repo total, 123M só em `.git`.** Sem "peso fantasma" relevante no histórico (~2.2MB em blobs removidos, nada como os 44MB achados no vision-core) — o peso real está em `front/` (78M, sprites/gifs de agentes) e `ui/` (44M, screenshots de teste visual regression comitados).
- **Zero `.env` real rastreado, em toda a história do repo** — só `.env.example` (template, sem valor real). Melhor que o vision-core nesse quesito.
- **`node_modules/` (666 arquivos) e `__pycache__/*.pyc` (10 arquivos) rastreados por engano** — `.gitignore` só tinha `*.zip`/`*.docx`, faltavam as regras. Fixado na Fase B (ver abaixo).
- **Par `deploy_backend_eb.py`/`deploy_backend_aws_eb.py` confirmado como wrapper fino** — candidato a consolidação, decisão registrada no `CLAUDE.md`.
- **Par `rollback_backend.py`/`rollback_backend_eb.py`** — mesma família, mas relação genérico-vs-específico (não wrapper-vs-real). Registrado, não decidido.
- **Documentação duplicada:** 12 arquivos numerados (6 `README_V2_*.txt` + 6 `docs/*.md`) cobrindo os mesmos 6 releases, conteúdo equivalente reformatado. Nenhuma pendência aberta nas 12.
- **Os 3 scripts PowerShell dormentes do vision-core (`fix-deploy.ps1` etc.) NÃO existem neste repo** — eram exclusivos de lá.

Relatório completo entregue ao usuário antes de qualquer mudança. Ordem de execução combinada: Fase A (este documento) → Fase B (gitignore) → Fase C (consolidação de deploy, pendente confirmação) → Fase D (documentação, pendente decisão).

---

## Fase A — CLAUDE.md + CLAUDE_HISTORY.md criados

Ver conteúdo do `CLAUDE.md` — stack, rotas reais varridas em `backend/src/app.js` + `backend/src/routes/*.js`, env vars com defaults confirmados via grep, decisões de escopo registradas. Commit isolado, sem mudança de código.

---

## Fase B — FECHADA (2026-07-04) — limpeza de .gitignore/tracking

`.gitignore` ganhou `node_modules/` e `__pycache__/` (encoding confirmado ASCII sem BOM antes e depois da edição — não é o bug do vision-core). `git rm -r --cached` em 666 arquivos de `node_modules/` + 10 `.pyc` de `__pycache__/` — nada apagado do disco, só parou de ser versionado. Confirmado antes do commit: arquivos continuam presentes fisicamente (`ls node_modules` funcionando), `git status` só mostrava as 677 remoções + o `.gitignore` modificado, nada mais tocado.

## Fase C — FECHADA (2026-07-04) — consolidação dos scripts de deploy

Antes de mexer no workflow ativo, investigação encontrou que `deploy-production.yml` (chama o wrapper) e `release-auto-rollback.yml` (chama o script real, é o pipeline V2.14 documentado) não são equivalentes — o segundo é o canônico atual, o primeiro é mais antigo e não documentado em nenhum README numerado. Usuário confirmou plano original mesmo assim: consolidar por baixo sem mexer no trigger/lógica de nenhum workflow.

Implementado: fallback de env var nativo em `deploy_backend_eb.py` (`BACKEND_BUNDLE_PATH or AWS_EB_BUNDLE`, mesmo padrão pra bucket/version-label), `deploy_backend_aws_eb.py` apagado, `deploy-production.yml` atualizado pra chamar o script real. Testado localmente com os dois conjuntos de nomes de env var (sem deploy real) — ambos resolvem corretamente.

## Fase D — FECHADA (2026-07-04) — unificação da documentação numerada

Usuário confirmou opção 1: migrar as 12 entradas (6 `README_V2_9..14_*.txt` + 6 `docs/15..20-v2-*.md`, mesmo conteúdo duplicado em dois formatos) pro `CLAUDE_HISTORY.md` como seções cronológicas (ver `V2.9` a `V2.14` acima), e apagar os 12 originais depois de confirmação explícita da migração.

Processo: (1) conteúdo lido na íntegra dos 12 arquivos, sintetizado (não copiado literal) em 6 seções de ~4 linhas cada; (2) resumo mostrado ao usuário antes de apagar qualquer coisa; (3) checagem exaustiva via Grep — só `CLAUDE.md`/`CLAUDE_HISTORY.md` (próprios) mencionavam os nomes desses 12 arquivos, nenhum workflow/script/link interno referenciava; (4) usuário confirmou remoção; (5) `git rm` nos 12 arquivos, nota do topo deste arquivo atualizada de "não migrado" pra "migrado".

---

## 2026-07-05 — Fix real: `validate-prod.yml` falhando 100% desde 2026-07-02 (ReferenceError em `feeds.js`)

**Sintoma:** o workflow agendado `validate-prod.yml` (roda a cada 30min) falhava em toda execução desde pelo menos 2026-07-02, sempre no gate `npm run vitals:validate`. Não era problema de performance — LCP/CLS/load de todas as 3 páginas testadas (home/technet-ai/relatorios) estavam bem dentro dos thresholds. O **JS Runtime Guard** (entregue no V2.12, ver seção acima) trata qualquer erro de JS em runtime como FAIL automático, independente das métricas — e havia um erro real disparando em toda carga de página: `ReferenceError: source is not defined`.

**Diagnóstico em duas etapas, porque o relatório não tinha stack trace:**
1. `perf-validator/run_perf_validation.mjs` só gravava `err.message` (nunca `err.stack`) nos 3 pontos de captura de erro (`pageerror`, `window.error`, `unhandledrejection`) — por isso nenhuma sessão anterior conseguiu apontar o arquivo/linha exatos. Buscas no código-fonte do repo não acharam nenhum `source` solto de forma óbvia — o próprio texto do erro era idêntico em páginas que não compartilhavam nenhum script entre si, o que por um tempo pareceu apontar pra algo injetado fora do repo (Cloudflare Zaraz/Rocket Loader). Essa hipótese não foi confirmada nem descartada por falta de acesso de rede no ambiente local (`curl` sem saída de rede, `WebFetch` bloqueado com 403 pela Cloudflare).
2. Fix cirúrgico só na captura: `err.message` → `err.stack || err.message` (commit `b4d5825`). Publicado e disparado manualmente via `gh workflow run validate-prod.yml` (run `28728105960`, sem esperar o cron) — o relatório seguinte trouxe o stack trace real: `at Object.renderFeedBlock (feeds.js:675:101)`, chamado por `at Object.init (feeds.js:717:24)`.

**Causa raiz real, achada em segundos com o stack trace:** `front/assets/js/feeds.js:675` — dentro de `renderFeedBlock`, um `dispatchEvent` de telemetria usava os nomes de variável antigos `api`/`source`, de antes de uma renomeação que não foi propagada ali (as variáveis reais na função são `apiUrl`/`sourceName`, declaradas 6 linhas acima; a função irmã `hydrateGrid`, que ainda usa os nomes antigos porque lá eles *são* os nomes corretos, tem uma linha quase idêntica — provável origem do copy-paste). `api` não quebrava por coincidência: existe um `window.api` global definido em `runtime-config.js`. `source` não tinha esse acaso e lançava `ReferenceError` toda vez que a função rodava — em toda página, porque `renderFeedBlock`/`init` roda globalmente, não só nas páginas que declaram `<script src="feeds.js">` no HTML.

**Fix:** `{ api, label: source }` → `{ api: apiUrl, label: sourceName }` (commit `d408983`, 1 linha).

**Deploy + confirmação real:** push → `gh workflow run release-auto-rollback.yml -f release_track=front-only` (run `28728235959`, sucesso) → `gh workflow run validate-prod.yml` de novo pra forçar confirmação sem esperar o cron (run `28728328273`) → relatório: **`status: PASS` nas 3 páginas, campo `runtime_errors`/`window_errors` nem aparece mais** (antes presente em toda entrada). Primeiro PASS desde pelo menos 2026-07-02.

**Lição registrada:** capturar `err.stack` em vez de só `err.message` em qualquer instrumentação de erro de runtime economiza — nesse caso específico — a diferença entre "hipótese não confirmável sobre script de terceiro" e "achado em segundos, arquivo e linha exatos". Vale como padrão pra qualquer captura de erro futura neste repo.
