import json
import os
import shlex
import shutil
import ssl
import subprocess
import time
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
REPORTS = ROOT / 'reports' / 'json'
REPORTS.mkdir(parents=True, exist_ok=True)


def jload(path: Path, default):
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else default


def jdump(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding='utf-8')


def classify_error(exc: Exception) -> str:
    msg = str(exc)
    if 'unexpected keyword argument' in msg and 'context' in msg:
        return 'TOOLING_ERROR'
    if 'CERTIFICATE_VERIFY_FAILED' in msg:
        return 'SSL_ERROR'
    if 'timed out' in msg.lower():
        return 'TIMEOUT'
    return 'UNKNOWN'


def probe(url: str, timeout: int = 20):
    try:
        ctx = ssl.create_default_context()
        req = Request(url, headers={'User-Agent': 'TechNetSDDF/2.13'})
        with urlopen(req, timeout=timeout, context=ctx) as resp:
            body = resp.read(4096).decode('utf-8', errors='ignore')
            return {
                'ok': True,
                'status': getattr(resp, 'status', 200),
                'size': len(body),
                'info': body[:300],
                'error': None,
                'error_type': None,
            }
    except Exception as exc:
        return {
            'ok': False,
            'status': 0,
            'size': 0,
            'info': '',
            'error': str(exc),
            'error_type': classify_error(exc),
        }


def run_command_template(template: str, context: dict, dry_run: bool = False, cwd: Path | None = None):
    rendered = template.format(**context)
    if dry_run:
        return 0, f'[DRY-RUN] {rendered}', rendered
    proc = subprocess.run(rendered, cwd=str(cwd or ROOT), shell=True, capture_output=True, text=True)
    output = (proc.stdout or '') + (('\n' + proc.stderr) if proc.stderr else '')
    return proc.returncode, output.strip(), rendered


def run_python(rel_script: str, *args: str):
    cmd = ['python', rel_script, *args]
    proc = subprocess.run(cmd, cwd=str(ROOT), capture_output=True, text=True)
    output = (proc.stdout or '') + (('\n' + proc.stderr) if proc.stderr else '')
    return proc.returncode, output.strip()


def copy_if_exists(src: str | None, dst: Path):
    if not src:
        return False
    src_path = Path(src)
    if not src_path.exists():
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src_path, dst)
    return True


def now_iso_local() -> str:
    return time.strftime('%Y-%m-%dT%H:%M:%S%z')
