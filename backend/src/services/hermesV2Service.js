import { runTechNetAiTask } from './technetAiBridge.js';

function resolveMode(input={}) {
  if (input.type === 'comment' || input.type === 'community') return 'moderator';
  if (Number(input?.context?.signals?.hypeScore || 0) >= 0.7 || input?.flags?.needsCriticalReview) return 'critical';
  return 'editorial';
}

function buildPrompt({ mode, agent, topic='', comment='' }) {
  if (mode === 'moderator') {
    return `Você é Hermes, moderador da comunidade TechNet. Analise este comentário e responda de forma curta, útil e educada: ${comment}`;
  }
  if (mode === 'critical') {
    return `Você é um analista crítico do TechNetGame no nicho ${agent}. Detecte hype, utilidade prática e evidência real do tema: ${topic}`;
  }
  return `Você é um analista editorial do TechNetGame no nicho ${agent}. Avalie relevância, impacto e utilidade prática do tema: ${topic}`;
}

function buildConsensus(votes=[]) {
  const valid = votes.filter(v => v && v.result);
  const weighted = valid.reduce((acc, vote) => acc + Number(vote.result.score || 0) * Number(vote.result.confidence || 0.5), 0);
  const total = valid.reduce((acc, vote) => acc + Number(vote.result.confidence || 0.5), 0) || 1;
  const consensus = Math.round(weighted / total);
  const dominant = [...valid].sort((a,b)=>Number(b.result.score||0)-Number(a.result.score||0))[0];
  return { consensus, dominantAgent: dominant?.agent || 'ai', decision: consensus >= 85 ? 'publish' : consensus >= 70 ? 'review' : 'hold' };
}

function applyCritical(consensus, context={}) {
  let adjusted = consensus;
  const notes = [];
  if (Number(context?.signals?.hypeScore || 0) >= 0.8) { adjusted -= 8; notes.push('Critical Layer reduziu score por hype elevado.'); }
  if (Number(context?.signals?.sourceConfidence || 1) <= 0.5) { adjusted -= 10; notes.push('Critical Layer detectou confiança reduzida na fonte.'); }
  return { adjustedConsensus: Math.max(0, adjusted), notes };
}

function applyMemory(adjustedConsensus, memory={}) {
  let boosted = adjustedConsensus;
  const notes = [];
  if (memory?.topicRecurring && memory?.historicallyHighEngagement) { boosted += 4; notes.push('Memory Layer favoreceu o tema por histórico positivo.'); }
  if (memory?.overcoveredTopic) { boosted -= 5; notes.push('Memory Layer reduziu score por cobertura excessiva recente.'); }
  return { finalConsensus: Math.max(0, Math.min(100, boosted)), notes };
}

export async function runHermesV2(input={}) {
  const mode = resolveMode(input);
  if (mode === 'moderator') {
    const reply = await runTechNetAiTask({ mode, agent:'moderator', provider:'qwen', prompt: buildPrompt({ mode, comment: input.comment || '' }) });
    return {
      ok: true,
      mode,
      moderation: {
        action: reply.result.stance === 'reject' ? 'hide' : reply.result.stance === 'review' ? 'queue_review' : 'publish',
        reply: reply.result.reason || 'Comentário relevante detectado.',
        moderationScore: reply.result.score
      },
      logs: [
        'Router escolheu Moderator Mode.',
        'Community Layer avaliou o comentário.',
        'Hermes gerou resposta automática relevante.'
      ]
    };
  }

  const agents = ['ai','games','hardware','market','tech','security'];
  const votes = await Promise.all(agents.map(agent => runTechNetAiTask({
    mode,
    agent,
    provider:'qwen',
    prompt: buildPrompt({ mode, agent, topic: input.topic || 'Tema não informado' })
  })));

  const consensus = buildConsensus(votes);
  const critical = applyCritical(consensus.consensus, input.context || {});
  const memory = applyMemory(critical.adjustedConsensus, input.memory || {});
  return {
    ok: true,
    mode,
    topic: input.topic || '',
    skills: ['Editorial','Critical','Moderator'],
    modules: ['Router','Consensus Engine','Critical Layer','Memory Layer','Community Layer'],
    votes,
    consensus: consensus.consensus,
    finalConsensus: memory.finalConsensus,
    dominantAgent: consensus.dominantAgent,
    decision: consensus.decision,
    logs: [
      `Router escolheu ${mode} mode.`,
      'Bridge Hermes ↔ TechNet AI executou os prompts dos 6 agentes.',
      'Consensus Engine consolidou os votos.',
      ...critical.notes,
      ...memory.notes,
      'Community Layer pronto para feedback e moderação.',
      'Hermes emitiu a decisão final.'
    ]
  };
}
