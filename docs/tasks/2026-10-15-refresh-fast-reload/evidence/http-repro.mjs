// HTTP-level reproduction against the running repro API (stack.mjs).
// Case A: a refresh whose response never reaches the client (socket closed after the request is sent),
//         then the client retries with the cookie it still holds: once inside the 10 s grace, once after it.
// Case B (control): same timing, but the client did receive the rotated cookie.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { email, password } = JSON.parse(readFileSync(path.join(HERE, 'state.json'), 'utf8'));
const API = 'http://localhost:3300';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (t) => createHash('sha256').update(t).digest('hex');
const t = () => new Date().toISOString().slice(11, 23);
const sql = (q) => execFileSync('docker', ['exec', 'english-learning-postgres-1', 'psql', '-U', 'dev', '-d',
  'english_learning_reload_repro', '-At', '-F', ' | ', '-c', q], { encoding: 'utf8' }).trim();
const cookieOf = (res) => /refresh_token=([^;]+)/.exec(res.headers.get('set-cookie') ?? '')?.[1] ?? null;
const row = (token) => sql(`select left(id::text,8), chain_id, rotated_at, grace_until, left(successor_id::text,8)
  from refresh_tokens where token_hash='${sha(token)}'`);
const chainOf = (token) => sql(`select chain_id from refresh_tokens where token_hash='${sha(token)}'`);
const chain = (id) => sql(`select left(id::text,8), revoked_at, revoke_reason, (select count(*) from refresh_tokens r
  where r.chain_id=c.id) from session_chains c where id='${id}'`);

async function login(label) {
  const res = await fetch(`${API}/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, client: 'web', device_label: label }),
  });
  if (res.status !== 200) throw new Error(`login ${res.status} ${await res.text()}`);
  return cookieOf(res);
}

async function refresh(token) {
  const res = await fetch(`${API}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1', Cookie: `refresh_token=${token}` },
    body: '{}',
  });
  const body = await res.text();
  return { status: res.status, cookie: cookieOf(res), type: res.status >= 400 ? JSON.parse(body).type : undefined };
}

/** Sends the refresh, then closes the socket as soon as the request is fully written: the browser-unload shape. */
function abortedRefresh(token) {
  return new Promise((resolve) => {
    let answered = false;
    const req = http.request(`${API}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1', Cookie: `refresh_token=${token}` },
    }, () => { answered = true; });
    req.on('error', () => {});
    req.on('finish', () => { req.destroy(); setTimeout(() => resolve({ answeredBeforeClose: answered }), 50); });
    req.end('{}');
  });
}

console.log('=== Case A: response lost ===');
const t0 = await login('repro-http-A');
const chainA = chainOf(t0);
console.log(t(), 'login, T0 row:', row(t0));
const sentAt = Date.now();
console.log(t(), 'aborted refresh(T0):', await abortedRefresh(t0));
await sleep(1500);
console.log(t(), 'T0 row after abort:', row(t0));
console.log(t(), 'chain after abort:', chain(chainA));
await sleep(3000 - (Date.now() - sentAt));
const inGrace = await refresh(t0);
console.log(t(), '+3s refresh(T0):', inGrace.status, 'cookie row:', inGrace.cookie && row(inGrace.cookie));
await sleep(12_000 - (Date.now() - sentAt));
const late = await refresh(t0);
console.log(t(), '+12s refresh(T0):', late.status, late.type);
console.log(t(), 'chain after late retry:', chain(chainA));

console.log('=== Case B (control): response received ===');
const u0 = await login('repro-http-B');
const chainB = chainOf(u0);
const first = await refresh(u0);
console.log(t(), 'refresh(U0):', first.status, 'U1 row:', row(first.cookie));
await sleep(12_000);
const later = await refresh(first.cookie);
console.log(t(), '+12s refresh(U1):', later.status, later.type ?? '');
console.log(t(), 'chain B:', chain(chainB));
console.log('chains', { chainA, chainB });
