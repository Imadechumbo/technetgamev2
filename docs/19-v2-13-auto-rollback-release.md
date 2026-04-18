# V2.13 AUTO-ROLLBACK RELEASE

## Entregas
- Orquestrador de deploy com rollback automático.
- Registro explícito da última release estável.
- Wrappers de rollback para frontend e backend.
- Smoke validation pós-deploy.
- Purge Cloudflare antes/depois do rollback quando configurado.

## Comandos
```bash
npm run stable:record
npm run release:auto
```

## Variáveis críticas
- STABLE_FRONT_ZIP
- STABLE_BACK_ZIP
- CANDIDATE_FRONT_ZIP
- CANDIDATE_BACK_ZIP
- DEPLOY_FRONT_CMD
- DEPLOY_BACK_CMD
- ROLLBACK_FRONT_CMD
- ROLLBACK_BACK_CMD
- CLOUDFLARE_ZONE_ID
- CLOUDFLARE_API_TOKEN

## Regras de rollback
- Rotas críticas fora de 200
- API health fora de 200
- contrato FAIL
- runtime error no browser
- referência JS quebrada

## Observação
O rollback é automático somente se os comandos reais de deploy/rollback forem configurados.
