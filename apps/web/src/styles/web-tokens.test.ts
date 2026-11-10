// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

// The new UI's tokens (design giao diện mới §7.1–§7.2): a `wm-` set beside the old one, read from the workspace package.
const resolve = (file: string) => createRequire(import.meta.url).resolve(`@wordmet/design-tokens/${file}`);
const web = readFileSync(resolve('web.css'), 'utf8');
const webDark = readFileSync(resolve('web-dark.css'), 'utf8');

function tokens(css: string, prefix: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+):\\s*([^;]+);`, 'g'))) out.set(m[1], m[2].trim());
  return out;
}

const light = tokens(web, 'color-wm');
const dark = tokens(webDark, 'color-wm');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(map: Map<string, string>, fg: string, bg: string): number {
  const a = map.get(fg);
  const b = map.get(bg);
  if (!a || !b) throw new Error(`missing color token ${a ? bg : fg}`);
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: Array<[string, string]> = [
  ['ink', 'bg'], ['ink', 'surface'], ['muted', 'bg'], ['muted', 'surface'], ['on-accent', 'accent'], ['accent', 'surface'],
  ['pass', 'pass-soft'], ['fail', 'fail-soft'], ['mark-ink', 'mark'],
];

describe('wm design tokens (web.css, web-dark.css)', () => {
  it('web-dark.css has exactly the --color-wm-* keys of web.css', () => {
    expect(light.size).toBeGreaterThan(0);
    expect([...dark.keys()].sort()).toEqual([...light.keys()].sort());
  });

  it.each([['light', light], ['dark', dark]] as const)('text pairs reach 4.5:1 in %s', (_mode, map) => {
    const below = TEXT_PAIRS.filter(([f, b]) => contrast(map, f, b) < 4.5)
      .map(([f, b]) => `${f}/${b}=${contrast(map, f, b).toFixed(2)}`);
    expect(below).toEqual([]);
  });

  it('radius, shadow and text tokens are written in rem, never px', () => {
    const withPx = ['radius-wm', 'shadow-wm', 'text-wm']
      .flatMap((prefix) => [...tokens(web, prefix)].map(([name, value]) => [`${prefix}-${name}`, value]))
      .filter(([, value]) => /\dpx/.test(value));
    expect(withPx).toEqual([]);
    expect(tokens(web, 'radius-wm').size).toBe(8);
    expect(tokens(web, 'shadow-wm').size).toBe(8);
  });

  it('pins the values the design names', () => {
    expect(light.get('accent')).toBe('#1e3a8a');
    expect(dark.get('accent')).toBe('#8da2ff');
    expect(tokens(web, 'radius-wm').get('button')).toBe('0.625rem');
    expect(tokens(web, 'text-wm').get('base')).toBe('1rem');
    expect(tokens(web, 'shadow-wm').get('btn')).toBe('0 0.625rem 1.75rem -0.625rem rgb(30 58 138 / 0.34)');
  });

  it('pins the auth heading sizes (M2 Figma §3: 44 / 38 page titles, 30 / 26 card headings)', () => {
    const text = tokens(web, 'text-wm');
    expect([text.get('page-title'), text.get('page-title--line-height')]).toEqual(['2.75rem', '1.18']);
    expect([text.get('page-title-mobile'), text.get('page-title-mobile--line-height')]).toEqual(['2.375rem', '1.22']);
    expect([text.get('card-heading'), text.get('card-heading--line-height')]).toEqual(['1.875rem', '1.3']);
    expect([text.get('card-heading-mobile'), text.get('card-heading-mobile--line-height')]).toEqual(['1.625rem', '1.3']);
  });
});
