import json
import ssl
import sys
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / 'config' / 'projects' / 'technetgame.json').read_text(encoding='utf-8'))
OUT = ROOT / 'reports' / 'json' / 'contract_validation_latest.json'
OUT.parent.mkdir(parents=True, exist_ok=True)


def classify_error(exc: Exception) -> str:
    msg = str(exc)
    if "unexpected keyword argument 'context'" in msg:
        return 'TOOLING_ERROR'
    if 'CERTIFICATE_VERIFY_FAILED' in msg:
        return 'SSL_ERROR'
    if 'timed out' in msg.lower():
        return 'TIMEOUT'
    return 'UNKNOWN'


def fetch_json(url: str):
    req = Request(url, headers={'User-Agent': 'TechNetSDDF/2.12'})
    ctx = ssl.create_default_context()
    with urlopen(req, timeout=20, context=ctx) as resp:
        raw = resp.read().decode('utf-8', errors='ignore')
        return getattr(resp, 'status', 200), json.loads(raw)


def expect_type(value, expected: str) -> bool:
    if expected == 'boolean':
        return isinstance(value, bool)
    if expected == 'number':
        return isinstance(value, (int, float)) and not isinstance(value, bool)
    if expected == 'string':
        return isinstance(value, str)
    if expected == 'object':
        return isinstance(value, dict)
    if expected == 'array':
        return isinstance(value, list)
    return False


results = []
final_status = 'PASS'
for contract in CFG.get('contracts', []):
    item = {
        'name': contract['name'],
        'url': contract['url'],
        'status': 'PASS',
        'notes': []
    }
    try:
        status_code, payload = fetch_json(contract['url'])
        item['notes'].append(f'http_status={status_code}')
        for field, field_type in contract.get('required_fields', {}).items():
            if field not in payload:
                item['status'] = 'FAIL'
                item['notes'].append(f'missing_field={field}')
                continue
            if not expect_type(payload[field], field_type):
                item['status'] = 'FAIL'
                item['notes'].append(f'invalid_type={field}:{field_type}')
        for field, expected_value in contract.get('expected_values', {}).items():
            if payload.get(field) != expected_value:
                item['status'] = 'FAIL'
                item['notes'].append(f'unexpected_value={field}:{payload.get(field)}')
    except Exception as exc:
        item['status'] = 'WARNING' if classify_error(exc) == 'TOOLING_ERROR' else 'FAIL'
        item['notes'].append(str(exc))
        item['error_type'] = classify_error(exc)
    results.append(item)
    if item['status'] == 'FAIL':
        final_status = 'FAIL'
    elif item['status'] == 'WARNING' and final_status != 'FAIL':
        final_status = 'WARNING'

from datetime import datetime, UTC

payload = {
    'generated_at': datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
    'status': final_status,
    'results': results,
}
OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'Contract validation {final_status} · relatório em {OUT}')
sys.exit(2 if final_status == 'FAIL' else 0)
