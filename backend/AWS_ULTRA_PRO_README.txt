TECHNETGAME AWS ULTRA PRO

O que já vem pronto:
- .ebextensions com ambiente base
- Healthcheck em /api/health
- Node fixado em 18.x no package.json
- Procfile pronto: web: node src/server.js
- .platform com nginx/gzip e hooks de deploy
- Sem .git, sem node_modules, sem package-lock.json

Antes do deploy:
1) Substitua todos os valores REPLACE_ME e CHANGE_ME_STRONG_TOKEN.
2) Faça o zip do conteúdo desta pasta ou use o pacote já fornecido.
3) No Elastic Beanstalk, plataforma Node.js em Amazon Linux 2/2023.
4) Após o deploy, teste:
   /api/health
   /api/news/latest

Se quiser guardar segredos na AWS:
- depois migre as chaves para Secrets Manager / SSM Parameter Store.
