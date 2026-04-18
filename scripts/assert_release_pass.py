import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
latest = root / 'reports' / 'json' / 'latest_run.json'
auto = root / 'reports' / 'json' / 'auto_rollback_release_latest.json'

paths = [p for p in [auto, latest] if p.exists()]
if not paths:
    raise SystemExit('Nenhum relatório encontrado em reports/json.')

payload = json.loads(paths[0].read_text(encoding='utf-8'))
decision = payload.get('decision') or payload.get('final_decision') or payload.get('status')
print(f'Decisão observada: {decision}')
if decision in {'PASS', 'WARNING'}:
    raise SystemExit(0)
raise SystemExit(2)
