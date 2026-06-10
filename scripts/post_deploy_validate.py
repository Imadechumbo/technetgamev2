import json
import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlopen, Request

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / "reports" / "json" / "post_deploy_validation.json"
REPORT.parent.mkdir(parents=True, exist_ok=True)

def probe(url):
    try:
        req = Request(url, headers={"User-Agent":"TechNetV210/2.10"})
        with urlopen(req, timeout=20) as r:
            body = r.read(4096).decode("utf-8", errors="ignore")
            return True, getattr(r, "status", 200), len(body), body[:300]
    except Exception as e:
        return False, None, 0, str(e)

def rollback():
    rc_front = subprocess.run([sys.executable, "scripts/rollback_frontend_from_s3_snapshot.py", "--target", "previous"], cwd=str(ROOT)).returncode
    rc_back = subprocess.run([sys.executable, "scripts/rollback_backend_from_s3_snapshot.py", "--target", "previous"], cwd=str(ROOT)).returncode
    return rc_front, rc_back

urls = {
    "frontend": os.getenv("FRONTEND_PROD_URL", ""),
    "api": os.getenv("API_PROD_HEALTH_URL", ""),
    "eb": os.getenv("AWS_EB_HEALTH_URL", "")
}
missing = [k for k,v in urls.items() if not v]
if missing:
    print(f"Variáveis ausentes: {', '.join(missing)}", file=sys.stderr)
    raise SystemExit(2)

max_wait = int(os.getenv("POST_DEPLOY_MAX_WAIT", "300"))
poll = int(os.getenv("POST_DEPLOY_POLL", "15"))
started = time.time()
evidence = []
ok = False

while time.time() - started < max_wait:
    evidence = []
    current_ok = True
    for name, url in urls.items():
        r = probe(url)
        evidence.append({"name": name, "url": url, "ok": r[0], "status": r[1], "size": r[2], "info": r[3]})
        if not r[0]:
            current_ok = False
    if current_ok:
        ok = True
        break
    time.sleep(poll)

payload = {
    "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    "ok": ok,
    "wait_seconds": int(time.time() - started),
    "evidence": evidence
}
REPORT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

if ok:
    print(f"Post-deploy validation PASS · relatório em {REPORT}")
    raise SystemExit(0)

print(f"Post-deploy validation FAIL · relatório em {REPORT}")
rcf, rcb = rollback()
print(f"Rollback frontend rc={rcf}")
print(f"Rollback backend rc={rcb}")
raise SystemExit(1)
