import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

function parseArgs(argv) {
  const opts = {
    base: 'http://localhost:3000',
    tokenFile: '',
    concurrency: 30,
    rounds: 3,
    paths: ['/v1/me', '/v1/groups', '/v1/me/entitlements'],
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--base' && next) { opts.base = next.replace(/\/+$/, ''); i++; }
    else if (arg === '--token-file' && next) { opts.tokenFile = next; i++; }
    else if (arg === '--concurrency' && next) { opts.concurrency = Number(next); i++; }
    else if (arg === '--rounds' && next) { opts.rounds = Number(next); i++; }
    else if (arg === '--paths' && next) { opts.paths = next.split(',').map((p) => p.trim()).filter(Boolean); i++; }
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node scripts/load-burst.mjs --base <url> --token-file <path> [--concurrency 30] [--rounds 3] [--paths /v1/me,/v1/groups,/v1/me/entitlements]');
      process.exit(0);
    }
  }
  if (!opts.tokenFile) {
    console.error('error: --token-file is required');
    process.exit(2);
  }
  if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1) {
    console.error('error: --concurrency must be a positive integer');
    process.exit(2);
  }
  if (!Number.isInteger(opts.rounds) || opts.rounds < 1) {
    console.error('error: --rounds must be a positive integer');
    process.exit(2);
  }
  if (opts.paths.length === 0) {
    console.error('error: --paths must contain at least one path');
    process.exit(2);
  }
  return opts;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function summarize(latencies, errors) {
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    count: latencies.length + errors,
    errors,
    p50: Number(percentile(sorted, 50).toFixed(1)),
    p95: Number(percentile(sorted, 95).toFixed(1)),
    max: Number((sorted[sorted.length - 1] ?? 0).toFixed(1)),
  };
}

async function hit(url, token) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    await res.arrayBuffer();
    const ms = performance.now() - t0;
    return { ok: res.ok, status: res.status, ms };
  } catch {
    return { ok: false, status: 0, ms: performance.now() - t0 };
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const token = readFileSync(opts.tokenFile, 'utf8').trim();
  if (!token) {
    console.error('error: token file is empty');
    process.exit(2);
  }

  const allLatencies = [];
  let totalErrors = 0;

  console.log(`load-burst: base=${opts.base} concurrency=${opts.concurrency} rounds=${opts.rounds} paths=${opts.paths.join(',')}`);
  console.log('path\tcount\terrors\tp50_ms\tp95_ms\tmax_ms');

  for (const path of opts.paths) {
    const url = `${opts.base}${path.startsWith('/') ? path : `/${path}`}`;
    const latencies = [];
    let errors = 0;

    for (let r = 0; r < opts.rounds; r++) {
      const wave = Array.from({ length: opts.concurrency }, () => hit(url, token));
      const results = await Promise.all(wave);
      for (const item of results) {
        if (item.ok) {
          latencies.push(item.ms);
          allLatencies.push(item.ms);
        } else {
          errors++;
          totalErrors++;
        }
      }
    }

    const s = summarize(latencies, errors);
    console.log(`${path}\t${s.count}\t${s.errors}\t${s.p50}\t${s.p95}\t${s.max}`);
  }

  const overall = summarize(allLatencies, totalErrors);
  console.log(`OVERALL\t${overall.count}\t${overall.errors}\t${overall.p50}\t${overall.p95}\t${overall.max}`);
  if (totalErrors > 0) process.exitCode = 1;
}

await main();
