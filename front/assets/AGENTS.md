# AGENTS.md — TechNetGame Sync System

## 🎯 MISSÃO
Manter frontend (Cloudflare Pages) e backend (Railway) 100% sincronizados, evitando erros de:
- CORS
- cache
- endpoints quebrados
- versionamento

---

## 🚨 REGRAS CRÍTICAS

1. Nunca alterar apenas frontend ou backend isoladamente.
2. Sempre revisar juntos:
   - backend/src/app.js
   - backend/src/middleware/errorHandler.js
   - site/assets/js/runtime-config.js
   - site/assets/js/feeds.js
   - site/index.html

---

## 🌐 CORS (OBRIGATÓRIO)

Backend deve SEMPRE retornar:

Access-Control-Allow-Origin:
- https://technetgame.com.br
- https://www.technetgame.com.br
- https://technetgame-site.pages.dev

Headers obrigatórios:
- Content-Type
- Authorization
- X-Refresh-Token
- Cache-Control
- Accept

---

## ⚠️ FETCH RULES (FRONTEND)

- NÃO usar headers desnecessários
- NÃO usar Cache-Control manual no fetch
- NÃO forçar preflight sem necessidade

---

## 🔗 API CONFIG

runtime-config.js deve usar:

https://api.technetgame.com.br

---

## 🧠 HOME RULES

- NÃO usar endpoint inexistente (/api/news/home)
- SEMPRE usar fallback Promise.allSettled
- Home NUNCA pode quebrar

---

## 🔁 VERSIONAMENTO

Sempre que alterar JS:

Atualizar index.html:

?ver=vXX-sync-fix

---

## 🧪 VALIDAÇÃO FINAL (OBRIGATÓRIO)

ANTES de finalizar:

- /api/health → OK
- /api/news/latest?limit=1 → OK
- Home carregando destaque
- ZERO CORS error
- ZERO endpoint inválido

---

## 🚀 FLUXO

1. Diagnosticar
2. Corrigir backend
3. Corrigir frontend
4. Atualizar versionamento
5. Validar requests
6. Gerar ZIP backend + site
7. Gerar comandos git

---

## 🏁 SUCESSO

✔ Home carregando  
✔ Sem CORS  
✔ Sem erro no DevTools  
✔ API estável  