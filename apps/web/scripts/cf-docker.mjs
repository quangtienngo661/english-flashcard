// Runs the Worker-runtime checks (OpenNext build + Playwright e2e) inside a Linux container.
// OpenNext cannot build on plain Windows (symlink errors), so Windows hosts use this instead (plan 2026-10-08-landing-deploy, Task 1).
// Usage from apps/web: pnpm cf:docker [extra playwright args]
//                      pnpm cf:docker --build   (production build only; output copied to .docker-out/.open-next)
//                      pnpm cf:docker --deploy  (production build + wrangler deploy, using the host's wrangler login)
//                      pnpm cf:docker --dev     (next dev on http://localhost:3000; Windows blocks the SWC binary next-intl loads)
// The build output holds absolute container paths, so deploying must happen in the same container that built it.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../../', import.meta.url)).replace(/[\\/]+$/, '');
const out = fileURLToPath(new URL('../.docker-out/', import.meta.url)).replace(/[\\/]+$/, '');
mkdirSync(out, { recursive: true });

const flag = process.argv[2];
const mode = flag === '--build' ? 'build' : flag === '--deploy' ? 'deploy' : 'test';
const playwrightArgs = process.argv.slice(mode === 'test' ? 2 : 3).map((a) => `'${a.replaceAll("'", "'\\''")}'`).join(' ');
// wrangler on Windows keeps its login under %APPDATA%\xdg.config\.wrangler.
const wranglerConfig = join(process.env.APPDATA ?? '', 'xdg.config', '.wrangler');

if (flag === '--dev') {
  // The repo is mounted live so edits on Windows show up; Linux node_modules and .next live in named volumes
  // so they never overwrite the Windows install. Local D1 stays in apps/web/.wrangler (shared with the host).
  const dev = spawnSync(
    'docker',
    [
      'run', '--rm', '--init', '--name', 'wordmet-dev',
      '-p', '3000:3000',
      '-v', `${repo}:/work`,
      '-v', 'wordmet-dev-nm-root:/work/node_modules',
      '-v', 'wordmet-dev-nm-web:/work/apps/web/node_modules',
      '-v', 'wordmet-dev-nm-api:/work/apps/api/node_modules',
      '-v', 'wordmet-dev-next:/work/apps/web/.next',
      '-v', 'wordmet-pnpm-store:/pnpm-store',
      '-e', 'WATCHPACK_POLLING=true',
      '-w', '/work',
      'node:24.11.0-bookworm',
      'bash', '-c',
      'set -e; corepack enable >/dev/null; corepack prepare pnpm@11.6.0 --activate >/dev/null; '
        + 'pnpm config set store-dir /pnpm-store >/dev/null; CI=1 pnpm install --frozen-lockfile; '
        + 'cd apps/web; pnpm db:migrate:local; pnpm dev -H 0.0.0.0 -p 3000',
    ],
    { stdio: 'inherit' },
  );
  process.exit(dev.status ?? 1);
}

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
if [ "$MODE" != test ]; then
  pnpm cf:build
  rm -rf /out/.open-next && cp -rL .open-next /out/.open-next
  if [ "$MODE" = deploy ]; then pnpm exec wrangler deploy; fi
  exit 0
fi
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
    '-e', `MODE=${mode}`,
    ...(mode === 'deploy' ? ['-v', `${wranglerConfig}:/wcfg/.wrangler`, '-e', 'XDG_CONFIG_HOME=/wcfg'] : []),
    // Build-time NEXT_PUBLIC_* values are passed through from the host.
    ...['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_INDEXABLE', 'NEXT_PUBLIC_CONTACT_EMAIL'].flatMap((k) => (process.env[k] ? ['-e', `${k}=${process.env[k]}`] : [])),
    'node:24.11.0-bookworm',
    'bash', '-c', script,
  ],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
