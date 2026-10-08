// Runs the Worker-runtime checks (OpenNext build + Playwright e2e) inside a Linux container.
// OpenNext cannot build on plain Windows (symlink errors), so Windows hosts use this instead (plan 2026-10-08-landing-deploy, Task 1).
// Usage from apps/web: pnpm cf:docker [extra playwright args]
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../../', import.meta.url)).replace(/[\\/]+$/, '');
const out = fileURLToPath(new URL('../.docker-out/', import.meta.url)).replace(/[\\/]+$/, '');
mkdirSync(out, { recursive: true });

const playwrightArgs = process.argv.slice(2).map((a) => `'${a.replaceAll("'", "'\\''")}'`).join(' ');

// Copy the repo without host build output or Windows node_modules, then install Linux dependencies.
const script = `
set -euo pipefail
mkdir -p /work
tar -C /src --exclude=node_modules --exclude=.next --exclude=.open-next --exclude=.wrangler \\
  --exclude=test-results --exclude=playwright-report --exclude=.docker-out --exclude=work -cf - . | tar -C /work -xf -
cd /work
corepack enable >/dev/null
corepack prepare pnpm@11.6.0 --activate >/dev/null
pnpm config set store-dir /pnpm-store >/dev/null
CI=1 pnpm install --frozen-lockfile
cd apps/web
pnpm exec playwright install --with-deps chromium
status=0
CI=1 pnpm test:e2e ${playwrightArgs} || status=$?
if [ "$status" -eq 0 ]; then pnpm assert:static || status=$?; fi
rm -rf /out/playwright-report /out/test-results
cp -r playwright-report test-results /out/ 2>/dev/null || true
exit $status
`;

const result = spawnSync(
  'docker',
  [
    'run', '--rm', '--init',
    '-v', `${repo}:/src:ro`,
    '-v', `${out}:/out`,
    '-v', 'wordmet-pnpm-store:/pnpm-store',
    '-v', 'wordmet-ms-playwright:/ms-playwright',
    '-e', 'PLAYWRIGHT_BROWSERS_PATH=/ms-playwright',
    'node:24.11.0-bookworm',
    'bash', '-c', script,
  ],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
