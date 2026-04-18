TECHNETGAME - IA REAL + PRODUCAO

O que foi ativado nesta versao:
- Porta padrao do Elastic Beanstalk ajustada para 8080
- Bind em 0.0.0.0
- Rota raiz / respondendo JSON para healthcheck externo
- /api/health agora exibe status dos providers de IA
- AI service com aliases de variaveis: GROQ_* / OPENROUTER_* / GEMINI_* / DEEPSEEK_* / VISION_*
- Timeout defensivo para requests aos providers
- .ebextensions sem chaves expostas

Variaveis minimas recomendadas no Elastic Beanstalk:
- PORT=8080
- NODE_ENV=production
- ALLOWED_ORIGINS=https://technetgame.com.br,https://www.technetgame.com.br,https://technetgame-site.pages.dev
- GROQ_API_KEY=...
- OPENROUTER_API_KEY=...
- GEMINI_API_KEY=...
- DEEPSEEK_API_KEY=...
- VISION_API_KEY=...

Endpoints para testar:
- /
- /api/health
- /api/v1/auth/demo
- /api/v1/models
- /api/v1/system/openclaw-status

Fluxo rapido:
1) Suba este zip no EB
2) Configure as variaveis reais no painel da AWS
3) Teste /api/health
4) Gere token em /api/v1/auth/demo
5) Teste POST /api/v1/chat
