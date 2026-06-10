import argparse
import fnmatch
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

DEFAULT_EXCLUDES = [
    'node_modules/*', '.git/*', '.github/*', 'dist/*', 'coverage/*',
    '*.log', '.env', '.env.*', '__pycache__/*', '*.pyc'
]

def should_skip(rel_path: str, patterns: list[str]) -> bool:
    rel = rel_path.replace('\\', '/')
    return any(fnmatch.fnmatch(rel, pat) for pat in patterns)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', default='backend')
    ap.add_argument('--output', default='dist/backend-release.zip')
    ap.add_argument('--exclude', action='append', default=[])
    args = ap.parse_args()

    source = Path(args.source).resolve()
    out = Path(args.output).resolve()
    if not source.exists():
        raise SystemExit(f'Pasta backend ausente: {source}')

    patterns = DEFAULT_EXCLUDES + args.exclude
    out.parent.mkdir(parents=True, exist_ok=True)
    total = 0
    with ZipFile(out, 'w', compression=ZIP_DEFLATED) as zf:
        for path in source.rglob('*'):
            if path.is_dir():
                continue
            rel = path.relative_to(source).as_posix()
            if should_skip(rel, patterns):
                continue
            zf.write(path, rel)
            total += 1
    print(f'Backend bundle gerado: {out} ({total} arquivos)')

if __name__ == '__main__':
    main()
