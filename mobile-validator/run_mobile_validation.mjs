import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'mobile-validator', 'config.json'), 'utf8'));
const outDir = path.join(root, 'reports', 'mobile');
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(root, 'reports', 'json'), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 393, height: 851 },
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135 Mobile Safari/537.36'
});
const page = await context.newPage();

const results = [];
for (const target of cfg.targets) {
  let status = 'PASS';
  let notes = [];
  const file = path.join(outDir, `${target.name}.png`);
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(cfg.checks.network_idle_wait_ms || 2500);
    const html = await page.content();
    const text = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 4000) : '');
    for (const bad of (cfg.checks.assert_no_chrome_error_strings || [])) {
      if (html.includes(bad) || text.includes(bad)) {
        status = 'FAIL';
        notes.push(`Encontrado marcador de erro: ${bad}`);
      }
    }
    if (cfg.checks.screenshot) await page.screenshot({ path: file, fullPage: true });
    const clickableCount = await page.locator('a, button, [role="button"]').count();
    notes.push(`Elementos clicáveis detectados: ${clickableCount}`);
  } catch (err) {
    status = 'FAIL';
    notes.push(String(err.message || err));
  }
  results.push({ name: target.name, url: target.url, status, screenshot: file, notes });
}
await browser.close();

const summary = {
  generated_at: new Date().toISOString(),
  status: results.every(r => r.status === 'PASS') ? 'PASS' : 'FAIL',
  results
};
fs.writeFileSync(path.join(root, 'reports', 'json', 'mobile_validation_latest.json'), JSON.stringify(summary, null, 2));
console.log(`Mobile validation ${summary.status} · relatório em ${path.join(root, 'reports', 'json', 'mobile_validation_latest.json')}`);
process.exit(summary.status === 'PASS' ? 0 : 2);
