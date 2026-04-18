Atualização Segura V2.12 PRO COMPLETO

Novidades:
- Web Vitals hard-block: LCP > 2500ms e CLS > 0.1 falham a release
- Contract API Lock: valida schema e valores críticos da API /api/health
- JS Runtime Guard: pageerror, unhandledrejection e erros de console entram na análise
- Score final unificado no gate e no dashboard
- Hardening do probe Python com TLS explícito e classificação TOOLING_ERROR

Fluxo recomendado:
1) npm install
2) npx playwright install chromium
3) node ui/capture_ui.mjs
4) node ui/update_baseline.mjs
5) npm run vitals:validate
6) npm run contract:validate
7) python safe_update.py --project technetgame --mode full
8) node panel/server.mjs
