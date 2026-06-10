import { askQwen } from './qwenService.js';

export async function runTechNetAiTask({ mode='editorial', agent='generic', provider='qwen', prompt='' }) {
  try {
    const result = await askQwen(prompt, { max_tokens: 260 });
    const text = String(result?.text || result?.content || result?.message || '');
    const matchScore = text.match(/(\d{2,3})/);
    return {
      ok: true,
      provider,
      agent,
      mode,
      result: {
        score: Math.max(60, Math.min(100, Number(matchScore?.[1] || 82))),
        confidence: 0.82,
        stance: 'approve',
        reason: text.slice(0, 220) || 'Resposta estruturada pela bridge do TechNet AI.'
      }
    };
  } catch (error) {
    return {
      ok: false,
      provider,
      agent,
      mode,
      error: error instanceof Error ? error.message : 'bridge_error',
      result: {
        score: 68,
        confidence: 0.40,
        stance: 'review',
        reason: 'Fallback local acionado após falha na bridge do TechNet AI.'
      }
    };
  }
}
