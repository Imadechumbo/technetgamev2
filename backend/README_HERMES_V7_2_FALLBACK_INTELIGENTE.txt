
TechNetGame Backend V7.2 — Hermes Fallback Inteligente

Novidades:
- Hermes usa OpenRouter/Qwen como principal.
- Fallback automático para Groq.
- Gemini como fallback final.
- Decision Engine com pesos dinâmicos e penalização de agentes fracos.
- Relatórios weekly/monthly/quarterly gerados por cron.

Rotas:
- GET /api/hermes/status
- GET /api/hermes/agents
- GET /api/hermes/:period
- POST /api/hermes/:period/generate
- POST /api/hermes/relearn
- POST /api/hermes/qwen-test

Variáveis importantes:
- OPENROUTER_MODEL=qwen/qwen3.6-plus:free
- HERMES_FALLBACK_ORDER=openrouter,groq,gemini
- HERMES_AGENT_PENALTY_MULTIPLIER=0.7
- HERMES_DECISION_CONFIDENCE_THRESHOLD=0.65

Deploy:
1. Substitua os arquivos no backend atual.
2. Atualize as env vars do Elastic Beanstalk.
3. Redeploy.
4. Teste /api/hermes/status e /api/hermes/monthly/generate
