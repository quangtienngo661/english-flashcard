// LP2: /vi and /en must be prerendered at build time.
// Source: .next/prerender-manifest.json `routes` (verified against the Next 16.4 build output in Task 1).
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../.next/prerender-manifest.json', import.meta.url), 'utf8'));
const routes = Object.keys(manifest.routes ?? {});
const missing = ['/vi', '/en'].filter((route) => !routes.includes(route));

if (missing.length > 0) {
  console.error(`Not prerendered: ${missing.join(', ')}. Prerendered routes: ${routes.join(', ') || '(none)'}`);
  process.exit(1);
}
console.log(`Static: ${['/vi', '/en'].join(', ')}`);
