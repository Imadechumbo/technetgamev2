V8.8 FIX FINAL

Ajuste aplicado na página relatorios:
- Hermes agora fica acima do quadro central
- board central teve z-index reduzido
- Hermes, glow e card final receberam prioridade de camada
- arena isolada para evitar conflito de stacking context

Deploy:
1. Suba este front no Cloudflare Pages
2. Faça purge cache
3. Teste /relatorios com Ctrl+F5
