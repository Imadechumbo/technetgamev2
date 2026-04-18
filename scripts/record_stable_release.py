import argparse
import hashlib
from pathlib import Path
from scripts.release_utils import ROOT, REPORTS, jdump, now_iso_local, copy_if_exists


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--front-zip', required=True)
    ap.add_argument('--back-zip', required=True)
    ap.add_argument('--label', default='stable')
    args = ap.parse_args()

    front = Path(args.front_zip).resolve()
    back = Path(args.back_zip).resolve()
    if not front.exists() or not back.exists():
        missing = []
        if not front.exists():
            missing.append(str(front))
        if not back.exists():
            missing.append(str(back))
        raise SystemExit(f'Arquivos ausentes: {", ".join(missing)}')

    stable_dir = ROOT / 'stable-release-artifacts'
    stable_dir.mkdir(parents=True, exist_ok=True)
    stable_front = stable_dir / front.name
    stable_back = stable_dir / back.name
    copy_if_exists(str(front), stable_front)
    copy_if_exists(str(back), stable_back)

    payload = {
        'generated_at': now_iso_local(),
        'label': args.label,
        'front_zip': str(stable_front),
        'back_zip': str(stable_back),
        'front_sha256': sha256_of(stable_front),
        'back_sha256': sha256_of(stable_back),
    }
    out = REPORTS / 'stable_release.json'
    jdump(out, payload)
    print(f'Stable release registrada em {out}')


if __name__ == '__main__':
    main()
