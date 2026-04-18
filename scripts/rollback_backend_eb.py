import argparse
import json
import os
import subprocess
import time


def run(cmd: list[str]):
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f'Falha em {cmd}: {(proc.stdout or "")}{(proc.stderr or "")}')
    return (proc.stdout or '') + (proc.stderr or '')


def wait_for_environment(environment_name: str, region: str, timeout: int = 900, poll: int = 15):
    started = time.time()
    while time.time() - started < timeout:
        out = run([
            'aws', 'elasticbeanstalk', 'describe-environments',
            '--environment-names', environment_name,
            '--region', region,
            '--output', 'json'
        ])
        data = json.loads(out)
        envs = data.get('Environments', [])
        if envs:
            env = envs[0]
            if str(env.get('Status', '')).lower() == 'ready':
                return env
        time.sleep(poll)
    raise RuntimeError(f'Timeout aguardando rollback do environment {environment_name}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--application', default=os.getenv('AWS_EB_APPLICATION'))
    ap.add_argument('--environment', default=os.getenv('AWS_EB_ENVIRONMENT'))
    ap.add_argument('--region', default=os.getenv('AWS_REGION', 'us-east-1'))
    ap.add_argument('--version-label', default=os.getenv('STABLE_BACKEND_APP_VERSION_LABEL'))
    ap.add_argument('--timeout', type=int, default=int(os.getenv('AWS_EB_WAIT_TIMEOUT', '900')))
    args = ap.parse_args()
    required = {'application': args.application, 'environment': args.environment, 'version_label': args.version_label}
    missing = [k for k, v in required.items() if not v]
    if missing:
        raise SystemExit(f'Variáveis ausentes: {", ".join(missing)}')

    print(run([
        'aws', 'elasticbeanstalk', 'update-environment',
        '--environment-name', args.environment,
        '--version-label', args.version_label,
        '--region', args.region
    ]))
    env = wait_for_environment(args.environment, args.region, timeout=args.timeout)
    print(json.dumps({'status': 'rolled_back', 'environment': env.get('EnvironmentName'), 'version_label': args.version_label}, ensure_ascii=False))

if __name__ == '__main__':
    main()
