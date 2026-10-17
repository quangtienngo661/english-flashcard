// Feasibility probe for one fix option (no app code changed): does a refresh sent with fetch({ keepalive: true })
// still store its Set-Cookie when the page navigates away while the request is in flight? Compared with the same
// request without keepalive. Runs on a non-app page of the admin origin (:5273) so the admin's own refresh never fires;
// the request is cross-origin to :3300 with JSON + X-CSRF-Protection, i.e. it needs a CORS preflight like the real one.
// Usage: node keepalive-probe.mjs [iterations]
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
const N = Number(process.argv[2] ?? 8);
const STATIC = 'http://localhost:5273/src/config.ts'; // same origin as the admin, but no app runs on it
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (t) => createHash('sha256').update(t).digest('hex');
const sql = (q) => execFileSync('docker', ['exec', 'english-learning-postgres-1', 'psql', '-U', 'dev', '-d',
  'english_learning_reload_repro', '-At', '-F', ' | ', '-c', q], { encoding: 'utf8' }).trim();

const browser = await chromium.launch({ headless: true });

async function variant(keepalive) {
  const context = await browser.newContext({ locale: 'vi-VN' });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  let sent = 0;
  cdp.on('Network.requestWillBeSent', (e) => {
    if (e.request.url.endsWith('/v1/auth/refresh') && e.request.method === 'POST') sent += 1;
  });
  await page.goto('http://localhost:5273/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('navigation').first().waitFor({ timeout: 30_000 });
  await page.goto(STATIC);
  const cookie = async () => (await context.cookies('http://localhost:3300/v1/auth')).find((c) => c.name === 'refresh_token')?.value;
  const rotated = async () => sql(`select rotated_at is not null from refresh_tokens where token_hash='${sha(await cookie())}'`) === 't';
  const resync = () => page.evaluate(() => fetch('http://localhost:3300/v1/auth/refresh', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: '{}',
  }).then((r) => r.status));

  let stale = 0;
  let errors = 0;
  for (let i = 0; i < N; i++) {
    const before = sent;
    const err = await page.evaluate((ka) => {
      try {
        fetch('http://localhost:3300/v1/auth/refresh', {
          method: 'POST', credentials: 'include', keepalive: ka,
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: '{}',
        }).catch(() => {});
        return null;
      } catch (e) { return String(e); }
    }, keepalive);
    if (err) { errors += 1; console.log('fetch threw:', err); continue; }
    for (let w = 0; w < 400 && sent === before; w++) await sleep(2);
    await page.goto(STATIC); // the old document unloads while the refresh is on the wire
    await sleep(800);
    const isStale = await rotated();
    if (isStale) stale += 1;
    // Put the cookie back on the newest token (inside the 10 s grace) before the next try.
    if (isStale) await resync();
    await sleep(300);
  }
  const chainId = sql(`select chain_id from refresh_tokens where token_hash='${sha(await cookie())}'`);
  const rotations = Number(sql(`select count(*) from refresh_tokens where chain_id='${chainId}'`)) - 1;
  const graces = readFileSync(path.join(HERE, 'api.log'), 'utf8').split('\n').filter((l) => l.includes(chainId) && l.includes('refresh_grace_used')).length;
  console.log(`keepalive=${keepalive}: ${N} tries, requests seen leaving the browser ${sent}, cookie left on an already-rotated token ${stale} times, fetch errors ${errors}; server: rotations ${rotations}, grace answers ${graces}, chain ${chainId.slice(0, 8)} revoked=${sql(`select coalesce(revoke_reason,'no') from session_chains where id='${chainId}'`)}`);
  await context.close();
}

await variant(false);
await variant(true);
await browser.close();
