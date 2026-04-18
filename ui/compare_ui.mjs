import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'ui', 'config', 'pages.json'), 'utf8'));
const rules = JSON.parse(fs.readFileSync(path.join(root, 'ui', 'intelligent_diff_rules.json'), 'utf8'));
const currentDir = path.join(root, 'ui', 'current');
const baseDir = path.join(root, 'ui', 'baselines');
const diffDir = path.join(root, 'ui', 'diff');
const reportFile = path.join(root, 'reports', 'json', 'ui_diff_latest.json');
fs.mkdirSync(diffDir, { recursive: true });
fs.mkdirSync(path.dirname(reportFile), { recursive: true });

const summary = {
  generated_at: new Date().toISOString(),
  status: 'PASS',
  pages: [],
  summary: {
    max_diff_pct: 0,
    ignore_small_pct_under: rules.ignore_small_pct_under,
    warn_pct_under: rules.warn_pct_under,
    fail_pct_at_or_above: rules.fail_pct_at_or_above
  }
};

for (const target of cfg.pages) {
  const cur = path.join(currentDir, `${target.name}.png`);
  const base = path.join(baseDir, `${target.name}.png`);
  if (!fs.existsSync(cur) || !fs.existsSync(base)) {
    summary.pages.push({ name: target.name, status: 'FAIL', reason: 'baseline ou captura ausente' });
    summary.status = 'FAIL';
    continue;
  }
  const img1 = PNG.sync.read(fs.readFileSync(base));
  const img2 = PNG.sync.read(fs.readFileSync(cur));
  const width = Math.min(img1.width, img2.width), height = Math.min(img1.height, img2.height);
  const p1 = new PNG({ width, height }), p2 = new PNG({ width, height });
  PNG.bitblt(img1, p1, 0, 0, width, height, 0, 0);
  PNG.bitblt(img2, p2, 0, 0, width, height, 0, 0);
  const diff = new PNG({ width, height });
  const mismatch = pixelmatch(p1.data, p2.data, diff.data, width, height, { threshold: 0.12, includeAA: true });
  const diffPct = Number(((mismatch / (width * height)) * 100).toFixed(3));
  fs.writeFileSync(path.join(diffDir, `${target.name}.png`), PNG.sync.write(diff));

  let status = 'PASS';
  if (diffPct < rules.ignore_small_pct_under) status = 'PASS';
  else if (diffPct >= rules.fail_pct_at_or_above) status = 'FAIL';
  else if (diffPct >= rules.warn_pct_under) status = 'WARNING';

  if (status === 'FAIL') summary.status = 'FAIL';
  else if (status === 'WARNING' && summary.status !== 'FAIL') summary.status = 'WARNING';

  summary.summary.max_diff_pct = Math.max(summary.summary.max_diff_pct, diffPct);
  summary.pages.push({ name: target.name, status, mismatch_pixels: mismatch, diff_pct: diffPct });
}
fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2));
console.log(`UI diff ${summary.status} · relatório em ${reportFile}`);
process.exit(summary.status === 'FAIL' ? 2 : 0);
