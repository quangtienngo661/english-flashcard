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
    expect(tokens(web, 'radius-wm').size).toBe(9);
    expect(tokens(web, 'shadow-wm').size).toBe(8);
  });

  it('pins the values the design names', () => {
    expect(light.get('accent')).toBe('#1e3a8a');
    expect(dark.get('accent')).toBe('#8da2ff');
    expect(tokens(web, 'radius-wm').get('button')).toBe('0.625rem');
    expect(tokens(web, 'radius-wm').get('xs')).toBe('0.1875rem');
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

  it('pins the app page title sizes (M7 Figma A §1.1, §1.5: 44 / 30, line-height 1.1)', () => {
    const text = tokens(web, 'text-wm');
    expect([text.get('app-title'), text.get('app-title--line-height'), text.get('app-title--letter-spacing')]).toEqual(['2.75rem', '1.1', '-0.0255em']);
    expect([text.get('app-title-mobile'), text.get('app-title-mobile--line-height'), text.get('app-title-mobile--letter-spacing')])
      .toEqual(['1.875rem', '1.1', '-0.023em']);
  });
});

// M3 (design §7.3, §7.4; motion doc §1, §3). Group inks: Figma's darker inks, green and blue mixed with ink (ruling).
const GROUP = ['#e5603f', '#149384', '#7a55d3', '#d99a17', '#4a9637', '#d2427a', '#2a86d1'];
const GROUP_INK = ['#984941', '#17696c', '#56429d', '#916d28', '#376d45', '#8c3765', '#29629d'];
const STAGE = [
  ['#eef0f4', '#9aa3b1', '#525a78'],
  ['#f7e8dc', '#c07a45', '#7c4a28'],
  ['#edf0f4', '#98a2b0', '#4d5664'],
  ['#fbf0c8', '#d4a72c', '#6f5208'],
  ['#dcf3ea', '#1f9d75', '#0c654c'],
];

describe('wm stage, group and motion tokens (M3)', () => {
  it('declares the six stage colours', () => {
    STAGE.forEach(([bg, dot, ink], n) => {
      expect([light.get(`stage-${n}-bg`), light.get(`stage-${n}-dot`), light.get(`stage-${n}-ink`)]).toEqual([bg, dot, ink]);
    });
    expect(light.get('stage-5-bg')).toBe('linear-gradient(90deg, #ffe0f2 0%, #fff2d1 35%, #dbffeb 70%, #d9f0ff 100%)');
    expect(light.get('stage-5-dot')).toBe('linear-gradient(135deg, #ff8ad9, #ffd46b, #8cffb5, #7ad6ff)');
    expect(light.get('stage-5-ink')).toBe('#3b2f6b');
    expect(light.get('stage-5-solid')).toBe('#b28bff');
  });

  it('declares seven group colours with soft, wash and ink, plus the empty tone', () => {
    GROUP.forEach((colour, n) => {
      expect(light.get(`group-${n}`)).toBe(colour);
      expect(light.get(`group-${n}-soft`)).toBe(`color-mix(in srgb, ${colour} 50%, #ffffff)`);
      expect(light.get(`group-${n}-wash`)).toBe(`color-mix(in srgb, ${colour} 12%, #ffffff)`);
      expect(light.get(`group-${n}-ink`)).toBe(GROUP_INK[n]);
    });
    expect(light.get('group-empty')).toBe('#64708c');
    expect(light.get('group-empty-soft')).toBe('color-mix(in srgb, #64708c 50%, #ffffff)');
    expect(light.get('group-empty-wash')).toBe('color-mix(in srgb, #64708c 12%, #ffffff)');
    expect(light.get('group-empty-ink')).toBe('#525a78');
  });

  it.each([0, 1, 2, 3, 4, 5, 6, 'empty'] as const)('group %s ink reaches 4.5:1 on white', (n) => {
    const map = new Map([['ink', light.get(`group-${n}-ink`) ?? ''], ['white', '#ffffff']]);
    expect(contrast(map, 'ink', 'white')).toBeGreaterThanOrEqual(4.5);
  });

  it('declares the carousel motion curves and durations', () => {
    const ease = tokens(web, 'ease-wm');
    expect(ease.get('out')).toBe('cubic-bezier(0.23, 1, 0.32, 1)');
    expect(ease.get('carousel')).toBe('cubic-bezier(0.3, 1.25, 0.5, 1)');
    expect(ease.get('flip')).toBe('cubic-bezier(0.3, 1.15, 0.5, 1)');
    expect(ease.get('rise')).toBe('cubic-bezier(0.3, 1.3, 0.5, 1)');
    expect(ease.get('count')).toBe('cubic-bezier(0.3, 1.4, 0.5, 1)');
    const ms = tokens(web, 'transition-duration-wm');
    expect(Object.fromEntries(['carousel', 'fade', 'blur', 'halo', 'rise', 'count', 'flip', 'page-in', 'lift'].map((k) => [k, ms.get(k)])))
      .toEqual({ carousel: '620ms', fade: '450ms', blur: '500ms', halo: '700ms', rise: '460ms', count: '520ms', flip: '380ms', 'page-in': '340ms', lift: '170ms' });
  });
});
