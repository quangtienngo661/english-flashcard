// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import oldThemeNames from './old-theme-names.json';
import { hits, sources } from './scan-src';

// Part 10 P.6 (Review Focus 4): the app stops importing theme.css, so a class or var() naming one of its tokens, or one of the old
// `@theme` tokens of globals.css, would silently resolve to nothing. theme.css stays for admin; the names are read from it, and from
// every `@theme` block of globals.css that is not the new UI's (`wm`).
const theme = readFileSync(createRequire(import.meta.url).resolve('@wordmet/design-tokens/theme.css'), 'utf8');
const web = readFileSync(createRequire(import.meta.url).resolve('@wordmet/design-tokens/web.css'), 'utf8');
const globals = sources.find((s) => s.file === 'app/globals.css')?.text ?? '';

/** The custom properties declared in a CSS text (a `--name--modifier` counts as `--name`). */
const declared = (css: string) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/--([a-z][a-z0-9-]*?)(?:--[a-z-]+)?\s*:/g)].map((m) => m[1]);

/** The bodies of the `@theme` blocks of a CSS text, nested keyframes included. */
function themeBlocks(css: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/@theme\b[^{]*\{/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < css.length && depth > 0; i += 1) {
      if (css[i] === '{') depth += 1;
      if (css[i] === '}') depth -= 1;
    }
    out.push(css.slice(m.index + m[0].length, i - 1));
  }
  return out;
}

const isWm = (name: string) => /(^|-)wm(-|$)/.test(name);
const oldGlobals = [...new Set(themeBlocks(globals).flatMap(declared))].filter((name) => !isWm(name));
// The 67 non-wm names of the old `@theme` block P.6 deleted from globals.css. Derived once from BASE 5e3e7f6e with the same rule as
// `oldGlobals`: `git show 5e3e7f6e:apps/web/src/app/globals.css`, every custom property declared in an `@theme` block, minus `wm` names.
// Frozen: the block is gone, so its names can no longer be read from the file.
const OLD = [...new Set([...declared(theme), ...oldGlobals, ...oldThemeNames])];

// The utility prefixes Tailwind builds from each namespace.
const PREFIX: Array<[RegExp, string]> = [
  [/^color-/, '(?:bg|text|border(?:-[xytrblse])?|ring(?:-offset)?|outline|fill|stroke|from|to|via|decoration|divide|caret|placeholder|accent|shadow)'],
  [/^radius-/, 'rounded(?:-[trblse]{1,2})?'],
  [/^shadow-/, 'shadow'],
  [/^animate-/, 'animate'],
  [/^ease-/, 'ease'],
  [/^font-/, 'font'],
  [/^text-/, 'text'],
  [/^container-/, '(?:max-w|min-w|w)'],
  [/^spacing-/, '(?:-?[pm][xytrblse]?|gap(?:-[xy])?|[wh]|min-[wh]|max-[wh]|size|inset(?:-[xy])?|top|right|bottom|left|scroll-[pm][xytrblse]?|space-[xy])'],
  [/^transition-duration-/, 'duration'],
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function patternFor(name: string): RegExp {
  const parts = [`var\\(--${escape(name)}[,)]`];
  const rule = PREFIX.find(([ns]) => ns.test(name));
  if (rule) parts.push(`(?<![\\w-])${rule[1]}-${escape(name.replace(rule[0], ''))}(?![\\w-])`);
  return new RegExp(parts.join('|'));
}

describe('no old token in src (P.6)', () => {
  it('reads the old names from the files and scans real sources (control)', () => {
    expect(OLD).toEqual(expect.arrayContaining(['color-primary', 'radius-sm', 'ease-enter', 'font-sans', 'container-prose', 'animate-menu-in']));
    expect(oldThemeNames).toHaveLength(67);
    expect(sources.length).toBeGreaterThan(100);
    expect(sources.some((s) => s.file === 'app/globals.css')).toBe(true);
    // The matcher finds a class and a var() it should (theme.css itself still has both shapes).
    expect(patternFor('color-primary').test('hover:bg-primary/40')).toBe(true);
    expect(patternFor('color-primary').test('bg-wm-primary')).toBe(false);
    expect(patternFor('radius-sm').test('rounded-t-sm')).toBe(true);
    expect(patternFor('ease-standard').test('transition: x 1s var(--ease-standard);')).toBe(true);
  });

  it('globals.css declares theme tokens of the new UI only', () => {
    expect(oldGlobals).toEqual([]);
  });

  it('no .ts, .tsx or .css file under src names an old token', () => {
    const found = OLD.flatMap((name) => hits(patternFor(name)).map((at) => `${name} @ ${at}`));
    expect(found).toEqual([]);
  });

  it('globals.css imports none of theme.css, dark.css, island.css', () => {
    expect(globals).not.toMatch(/@import '@wordmet\/design-tokens\/(theme|dark|island|dark-pastel)\.css'/);
  });
});

// With the old blocks gone their names leave the list above, so these classes are also checked against the tokens that exist.
describe('animate-, ease- and duration- classes name a live token (P.6)', () => {
  const live = (ns: string) => new Set([...declared(web), ...themeBlocks(globals).flatMap(declared)].filter((n) => n.startsWith(`${ns}-`)).map((n) => n.slice(ns.length + 1)));
  const BUILT_IN: Record<string, RegExp> = {
    animate: /^(none|spin|ping|pulse|bounce)$/,
    ease: /^(linear|in|out|in-out|initial)$/,
    duration: /^(\d+|initial)$/,
  };
  it.each([
    ['animate', 'animate'],
    ['ease', 'ease'],
    ['duration', 'transition-duration'],
  ])('every %s- class names a token or a Tailwind built-in', (prefix, ns) => {
    const names = live(ns);
    const unknown = sources.filter((s) => /\.tsx?$/.test(s.file)).flatMap(({ file, text }) =>
      [...text.matchAll(new RegExp(`(?<![\\w-])${prefix}-([a-z0-9]+(?:-[a-z0-9]+)*)(?=[\\s"'\`]|$)`, 'g'))]
        .map((m) => m[1])
        .filter((name) => !names.has(name) && !BUILT_IN[prefix].test(name))
        .map((name) => `${prefix}-${name} (${file})`));
    expect([...new Set(unknown)]).toEqual([]);
  });
});
