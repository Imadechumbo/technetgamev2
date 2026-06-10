V8.7 FINAL COMMUNITY + HERMES V2 + FORUM

Novidades:
- rota POST /api/hermes-v2/run
- rota GET /api/hermes-v2/status
- Bridge Hermes ↔ TechNet AI em src/services/technetAiBridge.js
- Hermes V2 com 3 skills: Editorial, Critical, Moderator
- 5 módulos internos: Router, Consensus Engine, Critical Layer, Memory Layer, Community Layer

Teste rápido:
1) GET /api/hermes-v2/status
2) POST /api/hermes-v2/run
Payload exemplo:
{
  "type":"news",
  "topic":"Nova GPU topo de linha anunciada",
  "context":{"signals":{"hypeScore":0.45,"sourceConfidence":0.88}},
  "memory":{"topicRecurring":true,"historicallyHighEngagement":true}
}
