import argparse
import json
import os
import subprocess
import time
from pathlib import Path


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
        if not envs:
            raise RuntimeError(f'Environment não encontrado: {environment_name}')
        env = envs[0]
        health = str(env.get('Health', '')).lower()
        status = str(env.get('Status', '')).lower()
        if status == 'ready' and health in {'green', 'ok'}:
            return env
        time.sleep(poll)
    raise RuntimeError(f'Timeout aguardando environment pronto: {environment_name}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bundle', default=os.getenv('BACKEND_BUNDLE_PATH', 'dist/backend-release.zip'))
    ap.add_argument('--application', default=os.getenv('AWS_EB_APPLICATION'))
    ap.add_argument('--environment', default=os.getenv('AWS_EB_ENVIRONMENT'))
    ap.add_argument('--bucket', default=os.getenv('AWS_S3_DEPLOY_BUCKET'))
    ap.add_argument('--region', default=os.getenv('AWS_REGION', 'us-east-1'))
    ap.add_argument('--version-label', default=os.getenv('BACKEND_VERSION_LABEL'))
    ap.add_argument('--timeout', type=int, default=int(os.getenv('AWS_EB_WAIT_TIMEOUT', '900')))
    args = ap.parse_args()

    required = {
        'application': args.application,
        'environment': args.environment,
        'bucket': args.bucket,
        'version_label': args.version_label,
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        raise SystemExit(f'Variáveis ausentes: {", ".join(missing)}')

    bundle = Path(args.bundle).resolve()
    if not bundle.exists():
        raise SystemExit(f'Bundle backend ausente: {bundle}')

    s3_key = f'elasticbeanstalk/{args.application}/{args.version_label}.zip'
    print(run(['aws', 's3', 'cp', str(bundle), f's3://{args.bucket}/{s3_key}', '--region', args.region]))
    print(run([
        'aws', 'elasticbeanstalk', 'create-application-version',
        '--application-name', args.application,
        '--version-label', args.version_label,
        '--source-bundle', f'S3Bucket={args.bucket},S3Key={s3_key}',
        '--auto-create-application',
        '--process',
        '--region', args.region
    ]))
    print(run([
        'aws', 'elasticbeanstalk', 'update-environment',
        '--environment-name', args.environment,
        '--version-label', args.version_label,
        '--region', args.region
    ]))
    env = wait_for_environment(args.environment, args.region, timeout=args.timeout)
    print(json.dumps({'status': 'ok', 'environment': env.get('EnvironmentName'), 'version_label': args.version_label}, ensure_ascii=False))

if __name__ == '__main__':
    main()
