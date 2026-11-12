// Runs Lighthouse (pinned) on the public pages, mobile and desktop, and prints the four scores.
// Usage: pnpm lighthouse [baseUrl]   (default http://localhost:3001; set CHROME_PATH to pick a browser)
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const VERSION = '13.6.0';
const PAGES = [
  { name: 'vi', path: '/vi' },
  { name: 'vi-privacy', path: '/vi/privacy' },
];
const FORMS = ['mobile', 'desktop'];

const pct = (c) => (c && typeof c.score === 'number' ? Math.round(c.score * 100) : null);

export function summarise(report) {
  const c = report.categories ?? {};
  return {
    performance: pct(c.performance),
    accessibility: pct(c.accessibility),
    bestPractices: pct(c['best-practices']),
    seo: pct(c.seo),
  };
}

export function lighthouseArgs(url, outputPath, form) {
  return [
    'dlx',
    `lighthouse@${VERSION}`,
    url,
    '--output=json',
    '--output=html',
    `--output-path=${outputPath}`,
    '--chrome-flags=--headless=new',
    '--quiet',
    ...(form === 'desktop' ? ['--preset=desktop'] : []),
  ];
}

function main(argv) {
  const baseUrl = (argv[0] ?? 'http://localhost:3001').replace(/\/$/, '');
  mkdirSync('.lighthouse', { recursive: true });
  const rows = [];
  let failed = false;
  for (const page of PAGES) {
    for (const form of FORMS) {
      const outPath = `.lighthouse/${page.name}-${form}`;
      // shell: true so pnpm (pnpm.cmd on Windows) resolves on both platforms; env passes CHROME_PATH through.
      const r = spawnSync('pnpm', lighthouseArgs(`${baseUrl}${page.path}`, outPath, form), { stdio: 'inherit', shell: true, env: process.env });
      if (r.status !== 0) {
        failed = true;
        console.error(`lighthouse failed for ${page.path} (${form})`);
        continue;
      }
      // With two --output formats Lighthouse writes <path>.report.json and <path>.report.html.
      const summary = summarise(JSON.parse(readFileSync(`${outPath}.report.json`, 'utf8')));
      rows.push({ page: page.path, form, ...summary });
    }
  }
  console.table(rows);
  return failed ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
