// Starts the built API (port 3300, DB english_learning_reload_repro) and the admin Vite dev server (port 5273),
// creates one verified admin account, writes it to state.json, and keeps both running until killed.
// Secrets are generated in memory and passed only through the child environment (no .env file).
import { spawn, execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createWriteStream, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = 'E:/Working/Working project/english-learning/.claude/worktrees/quizzical-mirzakhani-367db5';
const API_DIR = `${ROOT}/apps/api`;
const ADMIN_DIR = `${ROOT}/apps/admin`;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = 'http://localhost:3300';
const secret = () => randomBytes(32).toString('base64url');

const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: '3300',
  DATABASE_URL: 'postgresql://dev:dev@localhost:5434/english_learning_reload_repro',
  REDIS_URL: 'redis://localhost:6380',
  IMPORT_MAX_ROWS: '20000', IMPORT_MAX_BYTES: '10485760', EXPORT_MAX_ROWS: '5000', IMPORT_LEASE_SECONDS: '60',
  IMPORT_HEARTBEAT_SECONDS: '20', IMPORT_RECONCILE_SECONDS: '30', IMPORT_ROW_RETRIES: '3', IMPORT_JOB_ATTEMPTS: '3',
  IMPORT_FILE_RETENTION_DAYS: '30', JOB_QUEUE_PREFIX: 'wordmet-reloadrepro',
  JWT_KEYS: `k1:${secret()}`, JWT_ISSUER: API, JWT_AUDIENCE: 'english-learning',
  OTP_HMAC_KEY: secret(), RATE_LIMIT_HMAC_KEY: secret(), REFRESH_GRACE_KEY: secret(), ACCESS_TOKEN_TTL_SECONDS: '900',
  SMTP_HOST: 'localhost', SMTP_PORT: '1025', SMTP_FROM: 'no-reply@localhost', SMTP_USER: '', SMTP_PASS: '', SMTP_SECURE: 'false',
  MAIL_DAILY_BUDGET: '1500', MAIL_BUDGET_KEY: 'global',
  TRUST_PROXY: 'false', CORS_ORIGINS: 'http://localhost:5273', PROBLEM_TYPE_BASE: `${API}/problems/`,
  ADMIN_APP_URL: 'http://localhost:5273', MAINTENANCE_ENABLED: 'false',
};

const children = [];
function run(label, cmd, args, cwd, childEnv) {
  const log = createWriteStream(path.join(HERE, `${label}.log`), { flags: 'w' });
  const child = spawn(cmd, args, { cwd, env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.on('exit', (code) => console.log(`[${label}] exited ${code}`));
  children.push(child);
}
const stop = () => { for (const c of children) c.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

run('api', process.execPath, ['dist/main.js'], API_DIR, env);
run('admin', process.execPath, ['node_modules/vite/bin/vite.js', '--port', '5273', '--strictPort'], ADMIN_DIR,
  { ...process.env, VITE_API_BASE_URL: API });

async function waitFor(url) {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(url)).status < 500) return; } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`not up: ${url}`);
}
await waitFor(`${API}/v1/health`);
await waitFor('http://localhost:5273/');

async function otpFor(email) {
  for (let i = 0; i < 50; i++) {
    const list = await (await fetch('http://localhost:8025/api/v1/messages?limit=200')).json();
    for (const m of list.messages ?? []) {
      if (m.To?.[0]?.Address?.toLowerCase() !== email) continue;
      const full = await (await fetch(`http://localhost:8025/api/v1/message/${m.ID}`)).json();
      const code = /(\d{6})/.exec(full.Text ?? '');
      if (code) return code[1];
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('no OTP');
}

const email = `reload-${randomUUID().slice(0, 8)}@example.com`;
const password = 'Reload-Repro-Pass-9!';
const post = (p, body, token) => fetch(`${API}${p}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(body),
});
const reg = await post('/v1/auth/register', { email, password, timezone: 'Asia/Ho_Chi_Minh', client: 'web' });
if (reg.status !== 201) throw new Error(`register ${reg.status} ${await reg.text()}`);
const { access_token } = await reg.json();
const ver = await post('/v1/auth/verify-email', { code: await otpFor(email) }, access_token);
if (ver.status !== 200) throw new Error(`verify ${ver.status} ${await ver.text()}`);
execFileSync(process.execPath, ['dist/cli/admin-grant.js', email], { cwd: API_DIR, env, stdio: 'pipe' });
writeFileSync(path.join(HERE, 'state.json'), JSON.stringify({ email, password }, null, 2));
console.log(`READY ${email}`);
