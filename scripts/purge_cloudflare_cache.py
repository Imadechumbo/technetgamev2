import argparse
import json
import os
import sys
import urllib.request

ap = argparse.ArgumentParser()
ap.add_argument('--files', default='')
args = ap.parse_args()

zone_id = os.getenv('CLOUDFLARE_ZONE_ID', '')
token = os.getenv('CLOUDFLARE_API_TOKEN', '')

if not zone_id or not token:
    print('CLOUDFLARE_ZONE_ID ou CLOUDFLARE_API_TOKEN não definido.', file=sys.stderr)
    raise SystemExit(2)

url = f'https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache'
files = [x.strip() for x in (args.files or '').split(',') if x.strip()]
payload_obj = {'files': files} if files else {'purge_everything': True}
payload = json.dumps(payload_obj).encode('utf-8')
req = urllib.request.Request(
    url,
    data=payload,
    method='POST',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
)

try:
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode('utf-8', errors='ignore')
        print(f'Cloudflare purge OK: {body}')
except Exception as e:
    print(f'Cloudflare purge FAIL: {e}', file=sys.stderr)
    raise SystemExit(1)
