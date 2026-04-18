import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'perf-validator', 'config.json'), 'utf8'));
const outFile = path.join(root, 'reports', 'json', 'perf_validation_latest.json');
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

const initVitals = () => {
  window.__tngVitals = { cls: 0, lcp: 0, clsSources: 0, jsErrors: [], consoleErrors: [] };
  try {
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          window.__tngVitals.cls += entry.value || 0;
          window.__tngVitals.clsSources += 1;
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}

  try {
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry) {
        window.__tngVitals.lcp = Math.round(lastEntry.startTime || 0);
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}

  window.addEventListener('error', (event) => {
    window.__tngVitals.jsErrors.push(String(event.message || event.error || 'unknown_error'));
  });
  window.addEventListener('unhandledrejection', (event) => {
    window.__tngVitals.jsErrors.push(String(event.reason || 'unhandled_rejection'));
  });
};

const results = [];
for (const target of cfg.targets) {
  let requests = 0;
  const runtimeErrors = [];
  const consoleErrors = [];
  page.removeAllListeners('request');
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('request', () => requests++);
  page.on('pageerror', (err) => runtimeErrors.push(String(err.message || err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  let status = 'PASS';
  const notes = [];
  try {
    await page.addInitScript(initVitals);
    const start = Date.now();
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    const dcl = Date.now() - start;
    const startLoad = Date.now();
    await page.waitForLoadState('load', { timeout: 45000 });
    const load = dcl + (Date.now() - startLoad);
    await page.waitForTimeout(cfg.thresholds.vitals_settle_ms || 2000);

    const vitals = await page.evaluate(() => ({
      lcp: Math.round(window.__tngVitals?.lcp || 0),
      cls: Number((window.__tngVitals?.cls || 0).toFixed(4)),
      jsErrors: window.__tngVitals?.jsErrors || [],
      consoleErrors: window.__tngVitals?.consoleErrors || []
    }));

    if (dcl > cfg.thresholds.domcontentloaded_ms || load > cfg.thresholds.load_ms) {
      status = 'FAIL';
    }
    if (requests >= cfg.thresholds.request_count_fail) {
      status = 'FAIL';
    } else if (requests >= cfg.thresholds.request_count_warn && status !== 'FAIL') {
      status = 'WARNING';
    }
    if (vitals.lcp > cfg.thresholds.lcp_ms_hard_fail) {
      status = 'FAIL';
    }
    if (vitals.cls > cfg.thresholds.cls_hard_fail) {
      status = 'FAIL';
    }
    if (runtimeErrors.length || vitals.jsErrors.length) {
      status = 'FAIL';
    }

    notes.push(`domcontentloaded_ms=${dcl}`);
    notes.push(`load_ms=${load}`);
    notes.push(`request_count=${requests}`);
    notes.push(`lcp_ms=${vitals.lcp}`);
    notes.push(`cls=${vitals.cls}`);
    if (runtimeErrors.length) notes.push(`runtime_errors=${runtimeErrors.join(' | ')}`);
    if (vitals.jsErrors.length) notes.push(`window_errors=${vitals.jsErrors.join(' | ')}`);
    if (consoleErrors.length) notes.push(`console_errors=${consoleErrors.join(' | ')}`);
  } catch (err) {
    status = 'FAIL';
    notes.push(String(err.message || err));
  }
  results.push({ name: target.name, url: target.url, status, notes });
}
await browser.close();

const finalStatus = results.some(r => r.status === 'FAIL') ? 'FAIL' : (results.some(r => r.status === 'WARNING') ? 'WARNING' : 'PASS');
const payload = { generated_at: new Date().toISOString(), status: finalStatus, thresholds: cfg.thresholds, results };
fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
console.log(`Performance + Web Vitals validation ${finalStatus} · relatório em ${outFile}`);
process.exit(finalStatus === 'FAIL' ? 2 : 0);
