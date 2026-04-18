# V2.14 — variáveis e secrets para GitHub Actions

## Repository Variables
- `AWS_REGION` — ex.: `us-east-1`
- `AWS_EB_APPLICATION` — nome da aplicação Elastic Beanstalk
- `AWS_EB_ENVIRONMENT` — nome do ambiente Elastic Beanstalk
- `AWS_S3_DEPLOY_BUCKET` — bucket S3 usado para bundles do backend
- `STABLE_BACKEND_APP_VERSION_LABEL` — label da versão estável atual do backend no EB
- `CLOUDFLARE_PAGES_PROJECT` — project name do Cloudflare Pages

## Repository Secrets
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_ACCOUNT_ID`

## Arquivo estável do frontend
Coloque o ZIP estável do frontend em:

`stable-release-artifacts/STABLE_FRONT.zip`

ou informe outro caminho em `stable_front_zip_path` no dispatch manual do workflow.

## Fluxo recomendado
1. Commit do repo com `frontend/` e `backend/`.
2. Confirmar `STABLE_FRONT.zip` e `STABLE_BACKEND_APP_VERSION_LABEL`.
3. Rodar `TechNetGame V2.14 Auto Deploy + Rollback` com:
   - `front-only` para ajustes visuais
   - `back-only` para API/EB
   - `full` para release completo
4. Se a validação pós-deploy falhar, o workflow tenta rollback automaticamente.
