// Browser-level reproduction: real Chromium, real admin (Vite, :5273), real API (:3300).
// Usage: node browser-repro.mjs <fast|slow|inflight> [gapMs] [reloads] [abortPages]
//   fast: reload, wait gapMs after the navigation commits, reload again (F5 pressed repeatedly)
//   slow: reload, wait until the app has finished starting (signed in or a 429 countdown), reload again (control)
//   inflight: on pages listed in abortPages ('all' or e.g. '10'), reload gapMs after the page's refresh request was
//             sent (F5 while the refresh is on the wire); on the other pages behave like slow
// Network truth comes from the Chrome DevTools Protocol; server truth from the DB and the API log.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_DIR = 'E:/Working/Working project/english-learning/.claude/worktrees/quizzical-mirzakhani-367db5/apps/admin';
const { chromium } = createRequire(`${ADMIN_DIR}/package.json`)('@playwright/test');
const { email, password } = JSON.parse(readFileSync(path.join(HERE, 'state.json'), 'utf8'));
const [mode = 'fast', gapArg = '300', reloadsArg = '14', abortArg = 'all'] = process.argv.slice(2);
const aborts = (i) => abortArg === 'all' || abortArg.split(',').map(Number).includes(i);
const gap = Number(gapArg);
const reloads = Number(reloadsArg);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (t) => createHash('sha256').update(t).digest('hex');
const T0 = Date.now();
const ts = () => `+${((Date.now() - T0) / 1000).toFixed(3)}s`;
const sql = (q) => execFileSync('docker', ['exec', 'english-learning-postgres-1', 'psql', '-U', 'dev', '-d',
  'english_learning_reload_repro', '-At', '-F', ' | ', '-c', q], { encoding: 'utf8' }).trim();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ locale: 'vi-VN', viewport: { width: 1440, height: 900 } });
if (process.env.KEEPALIVE) await context.addInitScript(() => { const f = window.fetch; window.fetch = (input, init) => (String(input).endsWith('/v1/auth/refresh') ? f(input, { ...init, keepalive: true }) : f(input, init)); }); // simulates option A without touching app code
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');

const reqs = new Map(); // requestId -> record, refresh calls only
let pageNo = 0;
cdp.on('Network.requestWillBeSent', (e) => {
  if (!e.request.url.endsWith('/v1/auth/refresh') || e.request.method !== 'POST') return;
  reqs.set(e.requestId, { page: pageNo, sentAt: ts(), status: null, outcome: 'pending' });
});
cdp.on('Network.responseReceived', (e) => {
  const r = reqs.get(e.requestId);
  if (r) { r.status = e.response.status; r.headersAt = ts(); }
});
cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.outcome = 'finished'; });
cdp.on('Network.loadingFailed', (e) => {
  const r = reqs.get(e.requestId);
  if (r) r.outcome = e.canceled ? 'CANCELED' : `failed:${e.errorText}`;
});

const cookieValue = async () => (await context.cookies('http://localhost:3300/v1/auth')).find((c) => c.name === 'refresh_token')?.value;
const tokenRow = (v) => (v ? sql(`select left(id::text,8), rotated_at, grace_until from refresh_tokens where token_hash='${sha(v)}'`) : 'no cookie');

// Sign in through the UI.
await page.goto('http://localhost:5273/login');
await page.getByLabel('Email').fill(email);
await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
await page.getByRole('button', { name: 'Đăng nhập' }).click();
await page.getByRole('navigation').first().waitFor({ timeout: 30_000 });
const chainId = sql(`select chain_id from refresh_tokens where token_hash='${sha(await cookieValue())}'`);
console.log(ts(), 'signed in, chain', chainId, 'mode', mode, 'gap', gap, 'reloads', reloads);

const started = async () => {
  // Signed in (navigation shown) or the 429 countdown screen (loading with retryAt) or the login page.
  await Promise.race([
    page.getByRole('navigation').first().waitFor({ timeout: 30_000 }),
    page.waitForURL(/\/login/, { timeout: 30_000 }),
    page.waitForResponse((r) => r.url().endsWith('/v1/auth/refresh') && r.status() === 429, { timeout: 30_000 }),
  ]).catch(() => {});
};

for (let i = 1; i <= reloads; i++) {
  pageNo = i;
  await page.reload({ waitUntil: 'commit' }).catch((e) => console.log(ts(), 'reload error', e.message));
  if (mode === 'fast') await sleep(gap);
  else if (mode === 'inflight' && aborts(i) && i < reloads) {
    for (let w = 0; w < 400 && ![...reqs.values()].some((r) => r.page === i); w++) await sleep(5);
    await sleep(gap);
  } else await started();
}
const lastPage = pageNo;
console.log(ts(), `done reloading; watching page ${lastPage}`);

// Watch the last page: record the cookie the browser holds when it first gets a 429, then the outcome.
let cookieAt429 = null;
let outcome = 'timeout';
for (let i = 0; i < 160; i++) {
  const last = [...reqs.values()].filter((r) => r.page === lastPage);
  if (!cookieAt429 && last.some((r) => r.status === 429)) {
    const v = await cookieValue();
    cookieAt429 = { at: ts(), row: tokenRow(v) };
    console.log(ts(), 'first 429 on last page; browser cookie row (id | rotated_at | grace_until):', cookieAt429.row);
  }
  if (page.url().includes('/login')) { outcome = 'LOGIN PAGE (session lost)'; break; }
  if (last.some((r) => r.status === 200) && await page.getByRole('navigation').first().isVisible().catch(() => false)) {
    outcome = 'SIGNED IN'; break;
  }
  await sleep(500);
}
console.log(ts(), 'outcome:', outcome);

console.log('\n--- browser view of POST /v1/auth/refresh (CDP) ---');
for (const r of reqs.values()) console.log(`page ${String(r.page).padStart(2)} sent ${r.sentAt} status ${r.status ?? '-'} ${r.outcome}`);
const all = [...reqs.values()];
const count = (f) => all.filter(f).length;
console.log(`sent ${all.length}; 200 seen ${count((r) => r.status === 200)}; 429 seen ${count((r) => r.status === 429)};` +
  ` 401 seen ${count((r) => r.status === 401)}; canceled before any response ${count((r) => r.outcome === 'CANCELED' && r.status === null)};` +
  ` canceled after headers ${count((r) => r.outcome === 'CANCELED' && r.status !== null)}`);

console.log('\n--- server view ---');
console.log('chain (revoked_at | reason):', sql(`select revoked_at, revoke_reason from session_chains where id='${chainId}'`));
console.log('tokens (id | created | rotated | grace_until):');
console.log(sql(`select left(id::text,8), created_at, rotated_at, grace_until from refresh_tokens where chain_id='${chainId}' order by created_at`));
console.log('chain rate counter:', sql(`select window_start, count from rate_limit_counters where key like '%${chainId}%' order by window_start`));
const log = readFileSync(path.join(HERE, 'api.log'), 'utf8').split('\n').filter((l) => l.includes(chainId));
console.log(`api.log: refresh_grace_used ${log.filter((l) => l.includes('refresh_grace_used')).length},` +
  ` refresh_reuse_detected ${log.filter((l) => l.includes('refresh_reuse_detected')).length}`);
await browser.close();
