# V2.14 — GitHub Actions Auto Deploy + Rollback

## Objetivo
Automatizar deploy e rollback do TechNetGame via GitHub Actions, com Cloudflare purge e validação pós-deploy.

## Entregas
- release workflow manual com trilhas `front-only`, `back-only`, `full`
- deploy frontend com Wrangler para Cloudflare Pages
- bundle e deploy backend para AWS Elastic Beanstalk
- rollback frontend usando ZIP estável do repositório
- rollback backend usando version label estável do Elastic Beanstalk
- artifact de relatórios do Atualização Segura em cada execução

## Uso
1. Configurar variables/secrets do GitHub.
2. Garantir `stable-release-artifacts/STABLE_FRONT.zip` no repositório.
3. Executar o workflow `TechNetGame V2.14 Auto Deploy + Rollback`.
4. Acompanhar o artifact com relatórios e logs.
