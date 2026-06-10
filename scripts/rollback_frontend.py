import os
import sys
from pathlib import Path
from scripts.release_utils import REPORTS, jload, run_command_template

stable = jload(REPORTS / 'stable_release.json', {})
ctx = {
    'stable_front_zip': stable.get('front_zip', ''),
    'stable_back_zip': stable.get('back_zip', ''),
}
cmd = os.getenv('ROLLBACK_FRONT_CMD', '').strip()
if not cmd:
    print('ROLLBACK_FRONT_CMD não definido.', file=sys.stderr)
    raise SystemExit(2)
rc, out, rendered = run_command_template(cmd, ctx, dry_run=os.getenv('DRY_RUN_ROLLBACK', '0') == '1')
print(out or rendered)
raise SystemExit(rc)
