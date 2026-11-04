// Launch prep B design §5.4: /vi and /en are prerendered at build time (the landing must be static, LP2), and /vi/app, /en/app and every page under
// them are NOT: the app is rendered per request so each response carries its own CSP nonce. Replaces `assert:static`, which demanded the opposite for /app.
// Source: .next/prerender-manifest.json `routes` (verified against the Next 16.4 build output in Task 1).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const APP_ROUTE = /^\/(?:vi|en)\/app(?:\/|$)/;

/** @param {string[]} routes the prerendered routes @param {boolean} learnerApp the build has the learner app on */
export function renderModeProblems(routes, learnerApp) {
  const problems = [];
  for (const landing of ['/vi', '/en']) {
    if (!routes.includes(landing)) problems.push(`${landing} is not prerendered, the landing must be static`);
  }
  if (learnerApp) {
    for (const route of routes.filter((r) => APP_ROUTE.test(r))) problems.push(`${route} is prerendered, the app must be rendered per request`);
  }
  return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const manifest = JSON.parse(readFileSync(new URL('../.next/prerender-manifest.json', import.meta.url), 'utf8'));
  const routes = Object.keys(manifest.routes ?? {});
  const problems = renderModeProblems(routes, process.env.NEXT_PUBLIC_LEARNER_APP === 'on');
  if (problems.length > 0) {
    console.error(`${problems.join('\n')}\nPrerendered routes: ${routes.join(', ') || '(none)'}`);
    process.exit(1);
  }
  console.log(`Render mode: the landing is static; no page under /app is prerendered (prerendered: ${routes.join(', ')})`);
}
