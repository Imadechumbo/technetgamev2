V2.10 AUTO HEAL + CLOUDFLARE PURGE + MOBILE HARD LOCK

Comandos:
- npm install
- npx playwright install chromium
- python safe_update.py --project technetgame --mode full

Scripts extras:
- python scripts/purge_cloudflare_cache.py
- python scripts/post_deploy_validate.py

Secrets:
- CLOUDFLARE_ZONE_ID
- CLOUDFLARE_API_TOKEN
- FRONTEND_PROD_URL
- API_PROD_HEALTH_URL
- AWS_EB_HEALTH_URL
