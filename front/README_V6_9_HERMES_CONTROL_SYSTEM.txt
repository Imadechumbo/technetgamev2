V6.9 — AGENTES VIVOS + HERMES CONTROL SYSTEM

O que entrou:
- Hermes integrado como autoridade invisível no home
- Página /relatorios com layout premium
- Página Mês reforçada com identidade Hermes
- Ranking automático de agentes no front
- Imagem do Hermes com fundo transparente pronta para uso
- Guia rápido para usar Qwen 3.6/3.x free via backend

Fluxo recomendado:
1. Frontend TechNetGame
2. Backend AWS/Node
3. OpenClaw para operação
4. Hermes para memória estratégica
5. Qwen para geração de texto

Exemplo de variáveis no backend:
QWEN_API_KEY=...
QWEN_MODEL=qwen/qwen3-32b
HERMES_URL=http://localhost:3001

Exemplo de rota backend:
GET /api/hermes/reports
GET /api/hermes/ranking

Observação:
Este pacote atualiza o frontend e entrega a base visual e estrutural. A integração backend real do Hermes e do Qwen deve ser ligada no backend AWS com as variáveis acima.
