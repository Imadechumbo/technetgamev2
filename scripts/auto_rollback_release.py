import argparse
import os
import time
from pathlib import Path

from scripts.release_utils import (
    ROOT, REPORTS, classify_error, jdump, jload, now_iso_local, probe,
    run_command_template, run_python
)

CONFIG = ROOT / 'config' / 'projects' / 'technetgame.json'


def smoke_validate(cfg):
    urls = cfg['urls']
    checks = [
        ('frontend_root', urls['frontend_root']),
        ('technet_ai', cfg.get('release_orchestrator', {}).get('smoke_urls', {}).get('technet_ai', urls['frontend_root'].rstrip('/') + '/technet-ai')),
        ('relatorios', cfg.get('release_orchestrator', {}).get('smoke_urls', {}).get('relatorios', urls['frontend_root'].rstrip('/') + '/relatorios/')),
        ('api_health', urls['api_health']),
    ]
    evidence = []
    ok = True
    for name, url in checks:
        res = probe(url)
        evidence.append({'name': name, 'url': url, **res})
        if not res['ok'] or res['status'] < 200 or res['status'] >= 400:
            ok = False
    return ok, evidence


def final_release_status(smoke_ok, perf_status, contract_status):
    if not smoke_ok:
        return 'FAIL'
    if perf_status == 'FAIL' or contract_status == 'FAIL':
        return 'FAIL'
    if perf_status == 'WARNING' or contract_status == 'WARNING':
        return 'WARNING'
    return 'PASS'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--project', default='technetgame')
    ap.add_argument('--front-zip', required=True)
    ap.add_argument('--back-zip', required=True)
    ap.add_argument('--env', default='prod')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    cfg = jload(CONFIG, {})
    stable = jload(REPORTS / 'stable_release.json', {})

    if not stable.get('front_zip') or not stable.get('back_zip'):
        print('stable_release.json ausente ou incompleto. Rode stable:record antes do release.')
        raise SystemExit(2)

    front_zip = str(Path(args.front_zip).resolve())
    back_zip = str(Path(args.back_zip).resolve())
    if not Path(front_zip).exists() or not Path(back_zip).exists():
        print('front-zip ou back-zip não encontrado.')
        raise SystemExit(2)

    ctx = {
        'front_zip': front_zip,
        'back_zip': back_zip,
        'stable_front_zip': stable['front_zip'],
        'stable_back_zip': stable['back_zip'],
    }
    report = {
        'generated_at': now_iso_local(),
        'project': args.project,
        'env': args.env,
        'dry_run': args.dry_run,
        'stable_release': stable,
        'candidate_release': {
            'front_zip': front_zip,
            'back_zip': back_zip,
        },
        'steps': [],
        'rollback': {
            'triggered': False,
            'frontend_rc': None,
            'backend_rc': None,
            'verified': False,
        },
        'decision': 'FAIL',
    }

    def step(label, command_env_key, required=False):
        template = os.getenv(command_env_key, '').strip()
        if not template:
            status = 'FAIL' if required else 'WARNING'
            report['steps'].append({'label': label, 'status': status, 'details': [f'{command_env_key} não definido']})
            return 2 if required else 0
        rc, out, rendered = run_command_template(template, ctx, dry_run=args.dry_run)
        report['steps'].append({'label': label, 'status': 'PASS' if rc == 0 else 'FAIL', 'details': [rendered, out]})
        return rc

    snapshot_front_rc = step('Snapshot Frontend', 'SNAPSHOT_FRONT_CMD', required=False)
    snapshot_back_rc = step('Snapshot Backend', 'SNAPSHOT_BACK_CMD', required=False)
    deploy_front_rc = step('Deploy Frontend', 'DEPLOY_FRONT_CMD', required=True)
    deploy_back_rc = step('Deploy Backend', 'DEPLOY_BACK_CMD', required=True)

    if deploy_front_rc == 0 and os.getenv('CLOUDFLARE_ZONE_ID') and os.getenv('CLOUDFLARE_API_TOKEN'):
        rc, out = run_python('scripts/purge_cloudflare_cache.py')
        report['steps'].append({'label': 'Cloudflare Purge', 'status': 'PASS' if rc == 0 else 'FAIL', 'details': [out]})
    else:
        report['steps'].append({'label': 'Cloudflare Purge', 'status': 'WARNING', 'details': ['skip: env ausente ou deploy frontend falhou']})

    wait_seconds = int(os.getenv('POST_DEPLOY_STABILIZE_SECONDS', cfg.get('release_orchestrator', {}).get('post_deploy_stabilize_seconds', 45)))
    if not args.dry_run and wait_seconds > 0:
        time.sleep(wait_seconds)

    smoke_ok, evidence = smoke_validate(cfg)
    report['smoke_validation'] = {'status': 'PASS' if smoke_ok else 'FAIL', 'evidence': evidence}

    perf_rc, perf_out = run_python('perf-validator/run_perf_validation.mjs') if False else (0, 'skipped')
    # node script execution via subprocess shell to preserve local package behavior
    import subprocess
    perf_proc = subprocess.run(['node', 'perf-validator/run_perf_validation.mjs'], cwd=str(ROOT), capture_output=True, text=True)
    perf_out = ((perf_proc.stdout or '') + ('\n' + perf_proc.stderr if perf_proc.stderr else '')).strip()
    perf = jload(REPORTS / 'perf_validation_latest.json', {'status': 'FAIL'})
    report['steps'].append({'label': 'Performance + Web Vitals Guard', 'status': perf.get('status', 'FAIL'), 'details': [perf_out]})

    contract_rc, contract_out = run_python('contract-validator/run_contract_validation.py')
    contract = jload(REPORTS / 'contract_validation_latest.json', {'status': 'FAIL'})
    report['steps'].append({'label': 'Contract API Lock', 'status': contract.get('status', 'FAIL'), 'details': [contract_out]})

    release_status = final_release_status(smoke_ok, perf.get('status', 'FAIL'), contract.get('status', 'FAIL'))
    if release_status == 'FAIL':
        report['rollback']['triggered'] = True
        rollback_front_rc = step('Rollback Frontend', 'ROLLBACK_FRONT_CMD', required=True)
        rollback_back_rc = step('Rollback Backend', 'ROLLBACK_BACK_CMD', required=True)
        report['rollback']['frontend_rc'] = rollback_front_rc
        report['rollback']['backend_rc'] = rollback_back_rc
        if os.getenv('CLOUDFLARE_ZONE_ID') and os.getenv('CLOUDFLARE_API_TOKEN'):
            rc, out = run_python('scripts/purge_cloudflare_cache.py')
            report['steps'].append({'label': 'Cloudflare Purge Pós-Rollback', 'status': 'PASS' if rc == 0 else 'FAIL', 'details': [out]})
        verify_ok, verify_evidence = smoke_validate(cfg)
        report['rollback']['verified'] = verify_ok
        report['rollback']['verification_evidence'] = verify_evidence
        report['decision'] = 'ROLLED_BACK' if verify_ok and rollback_front_rc == 0 and rollback_back_rc == 0 else 'MANUAL_INTERVENTION_REQUIRED'
    else:
        stable_out = REPORTS / 'stable_release.json'
        stable_payload = {
            'generated_at': now_iso_local(),
            'label': 'stable',
            'front_zip': front_zip,
            'back_zip': back_zip,
        }
        jdump(stable_out, stable_payload)
        report['decision'] = 'PASS' if release_status == 'PASS' else 'WARNING'

    out = REPORTS / 'auto_rollback_release_latest.json'
    jdump(out, report)
    print(f'Auto-rollback release {report["decision"]} · relatório em {out}')
    raise SystemExit(0 if report['decision'] in {'PASS', 'WARNING'} else 2)


if __name__ == '__main__':
    main()
