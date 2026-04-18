import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config" / "projects" / "technetgame.json"


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore")


def extract_section(text: str, title: str) -> str:
    pattern = rf"^##\s*{re.escape(title)}\s*$([\s\S]*?)(?=^##\s+|\Z)"
    match = re.search(pattern, text, flags=re.MULTILINE)
    return match.group(1).strip() if match else ""


def main() -> int:
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    rel_root = ROOT / cfg["release"]["root"]
    required = cfg["release"]["required_files"]
    allowed_tracks = cfg["release"]["allowed_tracks"]

    results = {
        "status": "PASS",
        "checks": [],
        "track": None,
        "missing_files": [],
        "blocking_reasons": []
    }

    for name in required:
        p = rel_root / name
        ok = p.exists()
        results["checks"].append({"file": name, "exists": ok})
        if not ok:
            results["missing_files"].append(name)

    if results["missing_files"]:
        results["status"] = "FAIL"
        results["blocking_reasons"].append("Arquivos obrigatórios de release ausentes.")

    spec = rel_root / "SPEC.md"
    if spec.exists():
        text = read(spec)

        trilha_text = extract_section(text, "Trilha")
        track = trilha_text.splitlines()[0].strip() if trilha_text else None
        results["track"] = track

        if not track:
            results["status"] = "FAIL"
            results["blocking_reasons"].append("SPEC sem seção Trilha preenchida.")
        elif track not in allowed_tracks:
            results["status"] = "FAIL"
            results["blocking_reasons"].append(f"Trilha inválida: {track}")

        objetivo = extract_section(text, "Objetivo").lower()
        escopo = extract_section(text, "Escopo").lower()
        relevant = f"{objetivo}\n{escopo}"

        areas = 0

        if any(x in relevant for x in ["frontend", "mobile", "html", "css", "js"]):
            areas += 1

        if any(x in relevant for x in ["backend", "api", "upload", "zip", "print"]):
            areas += 1

        if any(x in relevant for x in ["deploy", "cloudflare", "aws", "elastic beanstalk"]):
            areas += 1

        if areas > 1:
            results["status"] = "FAIL"
            results["blocking_reasons"].append("SPEC sugere mistura de múltiplas trilhas/áreas.")
    else:
        results["status"] = "FAIL"
        results["blocking_reasons"].append("SPEC.md ausente.")

    out = ROOT / "reports" / "json" / "sddf_enforcement_latest.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"SDDF enforcement {results['status']} · relatório em {out}")
    if results["blocking_reasons"]:
        for r in results["blocking_reasons"]:
            print(f"- {r}")

    return 0 if results["status"] == "PASS" else 2


if __name__ == "__main__":
    raise SystemExit(main())