// Compares the first-load JS of the app routes with the old UI (design §5.7).
// Input: .next/diagnostics/route-bundle-stats.json (Turbopack builds only) against bundle-baseline.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const isApp = (route, prefix) => route === prefix || route.startsWith(`${prefix}/`);

const isBytes = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function compareBundles(baseline, stats, opts = {}) {
  const { prefix = '/[locale]/app', limit = 1.1, limits = {} } = opts;
  const appStats = stats.filter((s) => isApp(s.route, prefix));
  if (appStats.length === 0) throw new Error('no app routes in stats');
  for (const s of appStats) if (!isBytes(s.firstLoadUncompressedJsBytes)) throw new Error(`bad byte count for ${s.route}`);
  const after = new Map(appStats.map((s) => [s.route, s.firstLoadUncompressedJsBytes]));
  const before = Object.entries(baseline).filter(([route]) => isApp(route, prefix));
  const beforeMap = new Map(before);
  for (const [route, l] of Object.entries(limits)) {
    if (typeof l !== 'number' || !Number.isFinite(l) || l <= 1) throw new Error(`bad limit for ${route}`);
  }
  const rows = before
    .filter(([route]) => after.has(route))
    .map(([route, b]) => {
      if (!isBytes(b)) throw new Error(`bad baseline for ${route}`);
      const a = after.get(route);
      const rowLimit = limits[route] ?? limit;
      return { route, before: b, after: a, ratio: a / b, limit: rowLimit, over: a > b * rowLimit };
    })
    .sort((x, y) => (x.route < y.route ? -1 : 1));
  if (rows.length === 0) throw new Error('no routes to compare');
  for (const route of Object.keys(limits)) if (!rows.some((r) => r.route === route)) throw new Error(`unknown limit route ${route}`);
  const added = [...after.keys()].filter((r) => !beforeMap.has(r)).sort();
  const removed = [...beforeMap.keys()].filter((r) => !after.has(r)).sort();
  return { rows, added, removed };
}

const defaultStats = fileURLToPath(new URL('../.next/diagnostics/route-bundle-stats.json', import.meta.url));
const baselinePath = fileURLToPath(new URL('../bundle-baseline.json', import.meta.url));
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

function readStats(path) {
  const stats = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(stats)) throw new Error(`${path} is not an array of route rows`);
  return stats;
}

function main(argv) {
  const wi = argv.indexOf('--write-baseline');
  if (wi >= 0) {
    const statsPath = argv[wi + 1];
    const ci = argv.indexOf('--commit');
    const commit = ci >= 0 ? argv[ci + 1] : undefined;
    if (!statsPath || !commit) throw new Error('usage: --write-baseline <stats> --commit <sha>');
    const next = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8')).dependencies?.next;
    const routes = {};
    for (const s of readStats(statsPath).filter((r) => isApp(r.route, '/[locale]/app')).sort((x, y) => (x.route < y.route ? -1 : 1))) {
      routes[s.route] = s.firstLoadUncompressedJsBytes;
    }
    if (Object.keys(routes).length === 0) throw new Error('no app routes in stats');
    let old = {};
    try {
      old = JSON.parse(readFileSync(baselinePath, 'utf8'));
    } catch {}
    const kept = {};
    if (old.limits) kept.limits = old.limits;
    if (old.limitsWhy) kept.limitsWhy = old.limitsWhy;
    const baseline = { source: 'archive/giao-dien-cu-2026-11', commit, next: next ?? 'unknown', built: new Date().toISOString().slice(0, 10), routes, ...kept };
    writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`wrote ${baselinePath} with ${Object.keys(routes).length} routes`);
    return 0;
  }
  const base = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const { rows, added, removed } = compareBundles(base.routes, readStats(argv[0] ?? defaultStats), { limits: base.limits });
  for (const r of rows) console.log(`${r.over ? 'OVER ' : 'ok   '}${r.route}  before ${kb(r.before)}  after ${kb(r.after)}  ${(r.ratio * 100).toFixed(1)}%  (limit ${Math.round(r.limit * 100)}%)`);
  console.log(`added (only in the new UI): ${added.length ? added.join(', ') : 'none'}`);
  console.log(`removed (only in the old UI): ${removed.length ? removed.join(', ') : 'none'}`);
  return rows.some((r) => r.over) ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
