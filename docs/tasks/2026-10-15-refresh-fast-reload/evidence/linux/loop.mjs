// RKC3 scenario on Linux Chromium (own context: sign in, /uploads, reload, leave mid-refresh, 12 s, return), N times.
// Records every refresh fetch (keepalive flag, resolve/reject) and the refresh cookie before the reload and after the leave.
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
const runs = Number(process.argv[2] ?? 10);
const { EMAIL: email, PASSWORD: password } = process.env;
const h = (v) => (v ? createHash('sha256').update(v).digest('hex').slice(0, 12) : 'none');
const browser = await chromium.launch({ headless: true });
console.log('browser', browser.version());
let lost = 0;
for (let i = 1; i <= runs; i++) {
  const events = []; const t0 = Date.now();
  const context = await browser.newContext({ baseURL: 'http://localhost:5273', locale: 'vi-VN', viewport: { width: 1440, height: 900 } });
  await context.exposeBinding('rkReport', (_s, e) => events.push({ t: Date.now() - t0, ...e }));
  await context.addInitScript(() => {
    const original = window.fetch;
    window.fetch = (input, init) => {
      if (!String(input).endsWith('/v1/auth/refresh')) return original(input, init);
      const ka = init?.keepalive === true;
      window.rkReport({ phase: 'call', ka });
      return original(input, init).then((r) => { window.rkReport({ phase: 'resolve', ka, status: r.status }); return r; },
        (e) => { window.rkReport({ phase: 'reject', ka, err: `${e?.name}: ${e?.message}` }); throw e; });
    };
  });
  const page = await context.newPage();
  const cookie = async () => (await context.cookies('http://localhost:3300/v1/auth')).find((c) => c.name === 'refresh_token')?.value;
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.getByRole('navigation').waitFor();
  await page.goto('/uploads');
  await page.getByRole('heading', { level: 1, name: 'Lô nhập' }).waitFor();
  const before = await cookie();
  const refresh = page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/v1/auth/refresh'));
  await page.reload({ waitUntil: 'commit' });
  await refresh;
  await page.goto('about:blank');
  await new Promise((r) => setTimeout(r, 1500));
  const afterLeave = await cookie();
  await new Promise((r) => setTimeout(r, 10_500));
  await page.goto('/uploads');
  const ok = await page.getByRole('heading', { level: 1, name: 'Lô nhập' }).waitFor({ timeout: 5000 }).then(() => true, () => false);
  if (!ok) lost += 1;
  console.log(`run ${i}: ${ok ? 'SIGNED IN' : 'LOST'} | cookie before reload ${h(before)} | after leave ${h(afterLeave)} | ${before === afterLeave ? 'UNCHANGED' : 'changed'}`);
  console.log('   events:', events.map((e) => `${e.t}ms ${e.phase} ka=${e.ka}${e.status ? ' ' + e.status : ''}${e.err ? ' ' + e.err : ''}`).join(' ; '));
  await context.close();
}
console.log(`lost ${lost}/${runs}`);
await browser.close();
