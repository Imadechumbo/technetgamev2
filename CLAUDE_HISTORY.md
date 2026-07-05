# TECHNETGAME V2 — CLAUDE_HISTORY.md
## Histórico detalhado de sessões | Criado: 2026-07-04

> Write-up completo (causa raiz, fix, evidência) de cada sessão. O `CLAUDE.md` traz só o estado atual — aqui fica o "porquê" e o "como" de cada mudança, em ordem cronológica.
>
> As 12 entradas numeradas pré-existentes (`README_V2_9..14_*.txt` na raiz + `docs/15..20-v2-*.md`) documentam os releases V2.9–V2.14 e **ainda não foram migradas pra este arquivo** — decisão de fazer isso (ou não) pertence à Fase D do diagnóstico de 2026-07-04, ainda em aberto. Até essa decisão, elas continuam sendo a fonte de verdade desse período e devem ser consultadas diretamente.

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

## Fase B — pendente (limpeza de .gitignore/tracking)

## Fase C — pendente (consolidação dos scripts de deploy, aguardando confirmação do usuário)

## Fase D — pendente (unificação da documentação numerada, aguardando decisão do usuário)
