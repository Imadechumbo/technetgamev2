TECHNETGAME BACKEND - AWS READY

Este pacote está pronto para upload no AWS Elastic Beanstalk (Node.js).

O que já vem preparado:
- package.json com script start = node src/server.js
- Procfile com "web: npm start"
- app ouvindo process.env.PORT
- rotas AI montadas em /api/v1
- site estático embutido em /site para fallback
- .ebignore para evitar lixo local

Passos no AWS Elastic Beanstalk:
1. AWS Console > Elastic Beanstalk > Create application
2. Platform: Node.js
3. Upload code: este ZIP
4. Environment variables recomendadas:
   NODE_ENV=production
   ALLOWED_ORIGINS=https://technetgame.com.br,https://www.technetgame.com.br,https://technetgame-site.pages.dev
   PUBLIC_SITE_DIR=/var/app/current/site
5. Deploy

Depois do deploy:
- teste /api/health
- se quiser usar domínio custom, aponte api.technetgame.com.br para o endpoint do Elastic Beanstalk
- depois disso, o frontend pode continuar usando https://api.technetgame.com.br

Se quiser usar o endpoint temporário da AWS antes do domínio custom:
- edite assets/js/runtime-config.js no frontend e troque a base da API para a URL do Elastic Beanstalk
