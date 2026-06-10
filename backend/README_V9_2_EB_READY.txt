TechNetGame V9.2 backend limpo para Elastic Beanstalk

O que foi corrigido:
- removida a configuração inválida de rolling update do pacote
- healthcheck mantido em /api/health
- pacote pronto com arquivos na raiz para upload no EB
- engine alinhada para Node.js 20.x
- correção do erro "data is not defined" nos providers Groq / OpenRouter / Gemini

Como subir:
1. Use apenas o ambiente Technetgame-env-1
2. Faça upload deste ZIP no botão "Fazer upload e implantar"
3. Não crie novos ambientes
4. Depois teste:
   /api/health
   /api/v1/auth/demo
   /api/v1/models

Observações:
- se DeepSeek continuar 401, falta DEEPSEEK_API_KEY no painel da AWS
- a mensagem vermelha antiga vinha do arquivo .ebextensions/01-healthcheck.config anterior
