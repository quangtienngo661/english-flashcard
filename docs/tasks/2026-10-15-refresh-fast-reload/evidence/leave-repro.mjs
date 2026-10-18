// No rate limit involved: the admin reloads, the user leaves the page while that page's refresh is on the wire,
// and comes back to the admin after <waitS> seconds. Usage: node leave-repro.mjs [waitS]
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
const waitS = Number(process.argv[2] ?? 12);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (t) => createHash('sha256').update(t).digest('hex');
const sql = (q) => execFileSync('docker', ['exec', 'english-learning-postgres-1', 'psql', '-U', 'dev', '-d',
  'english_learning_reload_repro', '-At', '-F', ' | ', '-c', q], { encoding: 'utf8' }).trim();

const browser = await chromium.launch({ headless: true });
console.log('browser', browser.version());
const context = await browser.newContext({ locale: 'vi-VN' });
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
let sent = 0;
cdp.on('Network.requestWillBeSent', (e) => { if (e.request.url.endsWith('/v1/auth/refresh')) sent += 1; });
const cookie = async () => (await context.cookies('http://localhost:3300/v1/auth')).find((c) => c.name === 'refresh_token')?.value;

await page.goto('http://localhost:5273/login');
await page.getByLabel('Email').fill(email);
await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
await page.getByRole('button', { name: 'Đăng nhập' }).click();
await page.getByRole('navigation').first().waitFor({ timeout: 30_000 });
const chainId = sql(`select chain_id from refresh_tokens where token_hash='${sha(await cookie())}'`);

const before = sent;
await page.reload({ waitUntil: 'commit' });
for (let w = 0; w < 2000 && sent === before; w++) await sleep(1);
await page.goto('http://localhost:5273/src/config.ts'); // leave while the refresh is on the wire (no app here)
await sleep(500);
const held = sql(`select left(id::text,8), rotated_at from refresh_tokens where token_hash='${sha(await cookie())}'`);
console.log('after leaving: browser cookie row (id | rotated_at):', held);
await sleep(waitS * 1000);
await page.goto('http://localhost:5273/');
await Promise.race([
  page.getByRole('navigation').first().waitFor({ timeout: 20_000 }),
  page.waitForURL(/\/login/, { timeout: 20_000 }),
]).catch(() => {});
console.log(`back after ${waitS}s:`, page.url().includes('/login') ? 'LOGIN PAGE (session lost)' : 'SIGNED IN');
console.log('chain (revoked_at | reason):', sql(`select revoked_at, revoke_reason from session_chains where id='${chainId}'`));
console.log('chain rate counter:', sql(`select window_start, count from rate_limit_counters where key like '%${chainId}%' order by window_start`));
await browser.close();
