# V2.12 PRO COMPLETO

## Entregas
- Web Vitals com hard-block de LCP e CLS
- Contract Testing para a API crítica
- Guard de erros JS em runtime
- Score consolidado para decisão e dashboard
- Tratamento explícito para TOOLING_ERROR no probe Python

## Gates novos
- LCP > 2500ms => FAIL
- CLS > 0.1 => FAIL
- pageerror/unhandledrejection => FAIL
- contrato de API quebrado => FAIL
