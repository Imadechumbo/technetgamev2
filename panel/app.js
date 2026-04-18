async function boot(){
  const res=await fetch('/reports/json/latest_run.json');
  const data=await res.json();
  document.getElementById('decision').textContent=data.decision||'N/A';
  document.getElementById('project').textContent=data.project||'-';
  document.getElementById('mode').textContent=data.mode||'-';
  document.getElementById('env').textContent=data.env||'-';
  document.getElementById('results-count').textContent=(data.results||[]).length;
  document.getElementById('rollback').textContent=data.auto_heal?.rollback_triggered?'SIM':'NÃO';
  document.getElementById('score').textContent=data.score?`${data.score.overall} · ${data.score.band}`:'-';

  const relRes=await fetch('/reports/json/auto_rollback_release_latest.json').catch(()=>null);
  if(relRes&&relRes.ok){
    const rel=await relRes.json();
    document.getElementById('release-status').textContent=rel.decision||'-';
  } else {
    document.getElementById('release-status').textContent='-';
  }

  const agents=document.getElementById('agents');
  agents.innerHTML='';
  for(const r of (data.results||[])){
    const div=document.createElement('div');
    div.className='item';
    div.innerHTML=`<strong>${r.label}</strong><div class="small">${r.status} · ${r.summary}</div><div class="small">${(r.details||[]).join('<br>')}</div>`;
    agents.appendChild(div);
  }
  const perfRes=await fetch('/reports/json/perf_validation_latest.json').catch(()=>null);
  if(perfRes&&perfRes.ok){
    const perf=await perfRes.json();
    const box=document.getElementById('vitals');
    box.innerHTML='';
    for(const item of (perf.results||[])){
      const div=document.createElement('div');
      div.className='item';
      div.innerHTML=`<strong>${item.name}</strong><div class="small">${item.status}</div><div class="small">${(item.notes||[]).join('<br>')}</div>`;
      box.appendChild(div);
    }
  }
  const histRes=await fetch('/reports/json/release_history.json').catch(()=>null);
  if(histRes&&histRes.ok){
    const h=await histRes.json();
    const list=document.getElementById('history');
    list.innerHTML='';
    for(const item of (h.items||[])){
      const div=document.createElement('div');
      div.className='item';
      div.innerHTML=`<strong>${item.decision}</strong><div class="small">score=${item.score?.overall ?? '-'} · ${item.score?.band ?? '-'}</div><div class="small">${item.generated_at}</div><div class="small">${item.env||'-'}</div>`;
      list.appendChild(div);
    }
  }
}
boot();
