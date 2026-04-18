# V2.10 AUTO HEAL + CLOUDFLARE PURGE + MOBILE HARD LOCK

## Objetivo
Adicionar purge Cloudflare, hard lock mobile e auto-heal com rollback automático.

## Novidades
- purge de cache Cloudflare após deploy do frontend
- mobile validation precisa estar PASS antes da promoção
- validação pós-deploy das URLs reais
- rollback frontend/backend em falha
