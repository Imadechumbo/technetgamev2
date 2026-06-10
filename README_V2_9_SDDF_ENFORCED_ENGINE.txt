V2.9 SDDF ENFORCED ENGINE

Comandos:
- npm install
- npx playwright install chromium
- node ui/capture_ui.mjs
- node ui/update_baseline.mjs
- python safe_update.py --project technetgame --mode full
- node panel/server.mjs

Arquivos de release obrigatórios:
- release/CHANGE_REQUEST.md
- release/SPEC.md
- release/TEST_PLAN.md
- release/ROLLBACK_PLAN.md
