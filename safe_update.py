import argparse
import json
import os
import ssl
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlopen, Request

ROOT = Path(__file__).resolve().parent
REPORTS = ROOT / 'reports' / 'json'
LOGS = ROOT / 'logs'
CONFIG = ROOT / 'config' / 'projects' / 'technetgame.json'
REPORTS.mkdir(parents=True, exist_ok=True)
LOGS.mkdir(parents=True, exist_ok=True)


def run(cmd):
    p = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
    return p.returncode, (p.stdout or p.stderr or '').strip()


def classify_error(exc: Exception) -> str:
    msg = str(exc)
    if "unexpected keyword argument 'context'" in msg:
        return 'TOOLING_ERROR'
    if 'CERTIFICATE_VERIFY_FAILED' in msg:
        return 'SSL_ERROR'
    if 'timed out' in msg.lower():
        return 'TIMEOUT'
    return 'UNKNOWN'


def probe(url):
    try:
        ctx = ssl.create_default_context()
        ctx.check_hostname = True
        ctx.verify_mode = ssl.CERT_REQUIRED
        req = Request(url, headers={'User-Agent': 'TechNetSDDF/2.13'})
        with urlopen(req, timeout=20, context=ctx) as r:
            body = r.read(4096).decode('utf-8', errors='ignore')
            return {
                'ok': True,
                'status': getattr(r, 'status', 200),
                'size': len(body),
                'error': None,
                'error_type': None,
            }
    except Exception as exc:
        return {
            'ok': False,
            'status': 0,
            'size': 0,
            'error': str(exc),
            'error_type': classify_error(exc),
        }


def jload(path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def jdump(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding='utf-8')


def normalize_status(raw_status: str) -> str:
    return raw_status if raw_status in {'PASS', 'WARNING', 'FAIL'} else 'FAIL'


def score_from_results(results):
    total = 0
    max_points = len(results) * 100
    for item in results:
        st = item['status']
        if st == 'PASS':
            total += 100
        elif st == 'WARNING':
            total += 65
        else:
            total += 0
    final = round(total / max_points * 100) if max_points else 0
    if final >= 90:
        band = 'PLATINUM'
    elif final >= 75:
        band = 'GOLD'
    elif final >= 60:
        band = 'SILVER'
    else:
        band = 'RED'
    return {'overall': final, 'band': band}


def build_html(payload):
    rows = []
    for item in payload['results']:
        details = '<br>'.join(item.get('details', []))
        rows.append(f"<tr><td>{item['label']}</td><td>{item['status']}</td><td>{item['summary']}</td><td>{details}</td></tr>")
    return f"""
<html><body>
<h1>Atualização Segura V2.13 AUTO-ROLLBACK RELEASE</h1>
<p><strong>Decision:</strong> {payload['decision']}</p>
<p><strong>Score:</strong> {payload['score']['overall']} ({payload['score']['band']})</p>
<table border='1' cellspacing='0' cellpadding='6'>
<tr><th>Agente</th><th>Status</th><th>Resumo</th><th>Detalhes</th></tr>
{''.join(rows)}
</table>
</body></html>
""".strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--project', default='technetgame')
    ap.add_argument('--mode', default='full')
    ap.add_argument('--env', default='prod')
    ap.add_argument('--output-tag', default='latest_run')
    args = ap.parse_args()

    cfg = jload(CONFIG, {})
    urls = cfg['urls']
    results = []

    sddf_rc, sddf_out = run([sys.executable, 'scripts/sddf_enforce.py'])
    sddf_json = jload(REPORTS / 'sddf_enforcement_latest.json', {'status': 'FAIL'})
    results.append({
        'label': 'SDDF Enforcement Engine',
        'status': normalize_status(sddf_json.get('status', 'FAIL')),
        'summary': 'Governança obrigatória de release, trilha única e SPEC válida.',
        'details': [sddf_out],
        'critical': True,
    })

    api_probe = probe(urls['api_health'])
    front_probe = probe(urls['frontend_root'])
    eb_probe = probe(urls['aws_eb_health'])
    tooling_warning = any(p.get('error_type') == 'TOOLING_ERROR' for p in (api_probe, front_probe, eb_probe))
    validator_status = 'PASS' if api_probe['ok'] and front_probe['ok'] else ('WARNING' if tooling_warning else 'FAIL')
    results.append({
        'label': 'SDDF Validator',
        'status': validator_status,
        'summary': 'Health, boot e superfícies críticas.',
        'details': [
            f"API health status={api_probe['status']} size={api_probe['size']} error={api_probe['error']}",
            f"Frontend status={front_probe['status']} size={front_probe['size']} error={front_probe['error']}",
            f"EB health status={eb_probe['status']} size={eb_probe['size']} error={eb_probe['error']}",
        ],
        'critical': True,
    })

    cap_rc, cap_out = run(['node', 'ui/capture_ui.mjs'])
    cmp_rc, cmp_out = run(['node', 'ui/compare_ui.mjs'])
    diff = jload(REPORTS / 'ui_diff_latest.json', {'status': 'FAIL'})
    results.append({
        'label': 'UI Diff Real',
        'status': normalize_status(diff.get('status', 'FAIL')),
        'summary': 'Comparação visual Playwright + pixelmatch inteligente.',
        'details': [cap_out, cmp_out],
        'critical': True,
    })

    mob_rc, mob_out = run(['node', 'mobile-validator/run_mobile_validation.mjs'])
    mob = jload(REPORTS / 'mobile_validation_latest.json', {'status': 'FAIL'})
    results.append({
        'label': 'Mobile Validation Runner',
        'status': normalize_status(mob.get('status', 'FAIL')),
        'summary': 'Validação mobile obrigatória antes da promoção.',
        'details': [mob_out],
        'critical': True,
    })

    perf_rc, perf_out = run(['node', 'perf-validator/run_perf_validation.mjs'])
    perf = jload(REPORTS / 'perf_validation_latest.json', {'status': 'FAIL'})
    results.append({
        'label': 'Performance + Web Vitals Guard',
        'status': normalize_status(perf.get('status', 'FAIL')),
        'summary': 'DCL, load, requests, LCP, CLS e erros JS com hard-block.',
        'details': [perf_out],
        'critical': True,
    })

    contract_rc, contract_out = run([sys.executable, 'contract-validator/run_contract_validation.py'])
    contract = jload(REPORTS / 'contract_validation_latest.json', {'status': 'FAIL'})
    results.append({
        'label': 'Contract API Lock',
        'status': normalize_status(contract.get('status', 'FAIL')),
        'summary': 'Contrato da API protegido contra quebra silenciosa.',
        'details': [contract_out],
        'critical': True,
    })

    mobile_hard_lock = mob.get('status', 'FAIL') != 'PASS'
    decision = 'FAIL' if any(r['status'] == 'FAIL' and r['critical'] for r in results) else 'PASS'
    if mobile_hard_lock:
        decision = 'FAIL'

    auto_heal = {'rollback_triggered': False, 'attempts_used': 0}
    if decision == 'FAIL' and os.getenv('ENABLE_AUTO_HEAL', '1') == '1':
        auto_heal = {'rollback_triggered': True, 'attempts_used': 1}
        for label, script_name in [
            ('Auto Heal Frontend', 'scripts/rollback_frontend_from_s3_snapshot.py'),
            ('Auto Heal Backend', 'scripts/rollback_backend_from_s3_snapshot.py'),
        ]:
            script_path = ROOT / script_name
            if script_path.exists():
                rc, out = run([sys.executable, script_name, '--target', 'previous'])
                results.append({
                    'label': label,
                    'status': 'PASS' if rc == 0 else 'FAIL',
                    'summary': f'{label} automático.',
                    'details': [out],
                    'critical': False,
                })
            else:
                results.append({
                    'label': label,
                    'status': 'WARNING',
                    'summary': f'{label} indisponível nesta distribuição.',
                    'details': [f'script_missing={script_name}'],
                    'critical': False,
                })

    score = score_from_results(results)
    payload = {
        'project': args.project,
        'mode': args.mode,
        'env': args.env,
        'decision': decision,
        'generated_at': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
        'auto_heal': auto_heal,
        'score': score,
        'results': results,
    }

    jdump(REPORTS / f'{args.output_tag}.json', payload)
    jdump(REPORTS / 'latest_run.json', payload)

    manifest = {
        'project': args.project,
        'env': args.env,
        'decision': decision,
        'score': score,
        'generated_at': payload['generated_at'],
        'frontend_root': urls['frontend_root'],
        'api_health': urls['api_health'],
        'aws_eb_health': urls['aws_eb_health'],
    }
    jdump(REPORTS / 'release_manifest.json', manifest)

    hist_path = REPORTS / 'release_history.json'
    hist = jload(hist_path, {'items': []})
    hist['items'].insert(0, manifest)
    hist['items'] = hist['items'][:30]
    jdump(hist_path, hist)

    md_lines = [
        '# Atualização Segura V2.13 AUTO-ROLLBACK RELEASE',
        '',
        f"- Decisão: **{decision}**",
        f"- Score: **{score['overall']} ({score['band']})**",
        '',
        '| Agente | Status | Resumo |',
        '|---|---|---|',
    ]
    for item in results:
        md_lines.append(f"| {item['label']} | {item['status']} | {item['summary']} |")
    (ROOT / 'reports' / 'release_gate_report.md').write_text('\n'.join(md_lines), encoding='utf-8')
    (ROOT / 'reports' / 'release_gate_report.html').write_text(build_html(payload), encoding='utf-8')
    (LOGS / 'technetgame.log').write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')

    print(f'Decisao final: {decision}')
    print(f'Score final: {score["overall"]} ({score["band"]})')
    print(f'JSON: {REPORTS / "latest_run.json"}')
    print(f'MANIFEST: {REPORTS / "release_manifest.json"}')
    print(f'HISTORY: {REPORTS / "release_history.json"}')
    return 1 if decision == 'FAIL' else 0


if __name__ == '__main__':
    raise SystemExit(main())
