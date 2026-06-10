TECHNETGAME SITE - CLOUDFLARE READY

Este pacote está pronto para Cloudflare Pages.

O que foi ajustado:
- adicionado _headers para cache correto
- adicionado _redirects para technet-ai/admin-ui
- mantido runtime-config.js apontando para https://api.technetgame.com.br
- removidos arquivos do fluxo AWS

PASSO A PASSO NO CLOUDFLARE PAGES
1. Create project
2. Framework preset: None
3. Build command: deixe vazio
4. Output directory: /
5. Faça upload/publicação deste conteúdo estático

DOMÍNIO
- Conecte technetgame.com.br e www.technetgame.com.br ao Pages project
- Mantenha api.technetgame.com.br apontando para o Railway

IMPORTANTE
Se trocar a API depois, edite assets/js/runtime-config.js
