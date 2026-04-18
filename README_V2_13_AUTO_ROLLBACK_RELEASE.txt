ATUALIZAÇÃO SEGURA V2.13 AUTO-ROLLBACK RELEASE

Objetivo
- Fazer deploy controlado de front e back.
- Validar produção após o deploy.
- Fazer rollback automático para a última release estável se qualquer gate crítico falhar.

Pré-requisito obrigatório
1. Registrar a última release estável antes de publicar a candidata.
2. Configurar comandos reais de deploy e rollback via variáveis de ambiente.

Fluxo mínimo
1. set STABLE_FRONT_ZIP=C:\caminho\front-estavel.zip
2. set STABLE_BACK_ZIP=C:\caminho\back-estavel.zip
3. npm run stable:record
4. set CANDIDATE_FRONT_ZIP=C:\caminho\front-candidato.zip
5. set CANDIDATE_BACK_ZIP=C:\caminho\back-candidato.zip
6. set DEPLOY_FRONT_CMD=<seu comando de deploy front com {front_zip}>
7. set DEPLOY_BACK_CMD=<seu comando de deploy back com {back_zip}>
8. set ROLLBACK_FRONT_CMD=<seu comando de rollback front com {stable_front_zip}>
9. set ROLLBACK_BACK_CMD=<seu comando de rollback back com {stable_back_zip}>
10. npm run release:auto

Templates suportados nos comandos
- {front_zip}
- {back_zip}
- {stable_front_zip}
- {stable_back_zip}

Relatórios principais
- reports/json/auto_rollback_release_latest.json
- reports/json/stable_release.json
- reports/json/perf_validation_latest.json
- reports/json/contract_validation_latest.json
- reports/json/latest_run.json

Estados finais
- PASS
- WARNING
- ROLLED_BACK
- MANUAL_INTERVENTION_REQUIRED
