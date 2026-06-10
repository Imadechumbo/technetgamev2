Atualização Segura V2.14 — GitHub Actions Auto Deploy + Rollback

Entregas:
- workflow de release manual com auto-rollback
- deploy frontend via Wrangler / Cloudflare Pages
- purge Cloudflare após deploy e após rollback
- deploy backend via AWS CLI + Elastic Beanstalk
- rollback backend por version label estável
- workflow separado de validação contínua de produção

Arquivos principais:
- .github/workflows/release-auto-rollback.yml
- .github/workflows/validate-prod.yml
- scripts/build_backend_bundle.py
- scripts/deploy_backend_eb.py
- scripts/rollback_backend_eb.py
- scripts/assert_release_pass.py
- release/DEPLOY_VARIABLES_GITHUB.md

Observações:
- front-only é o caminho recomendado para mudanças de layout/mobile.
- o rollback do frontend usa um ZIP estável do repositório.
- o rollback do backend usa STABLE_BACKEND_APP_VERSION_LABEL.
