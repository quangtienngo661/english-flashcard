import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Audit 26/10/2026 #6: Tailwind emits no CSS for a `text-*` class that names no token, so the text silently falls back to
// the body size (`text-h1` on Plans and the practice summary). Every `text-*` class must name a colour token, a type token
// or a built-in text utility.
const theme = readFileSync(createRequire(import.meta.url).resolve('@wordmet/design-tokens/theme.css'), 'utf8');
const globals = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');
const src = fileURLToPath(new URL('..', import.meta.url));

const names = (css: string, prefix: string) =>
  new Set([...css.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+?)(?:--[a-z-]+)?:`, 'g'))].map((m) => m[1]));
const BUILT_IN = [
  'left', 'right', 'center', 'justify', 'start', 'end', 'wrap', 'nowrap', 'balance', 'pretty', 'ellipsis', 'clip',
  'transparent', 'current', 'inherit', 'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', '8xl', '9xl',
];
const allowed = new Set([...names(theme, 'color'), ...names(globals, 'color'), ...names(globals, 'text'), ...BUILT_IN]);

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') ? [path] : [];
  });
}

describe('text-* classes', () => {
  it('every text-* class names a colour token, a type token or a Tailwind text utility', () => {
    const unknown = new Set<string>();
    for (const file of sources(src)) {
      for (const m of readFileSync(file, 'utf8').matchAll(/(?<![\w-])text-([a-z0-9]+(?:-[a-z0-9]+)*)(?=[\s"'`/:]|$)/g)) {
        if (!allowed.has(m[1])) unknown.add(`text-${m[1]} (${file.slice(src.length)})`);
      }
    }
    expect([...unknown]).toEqual([]);
  });
});
