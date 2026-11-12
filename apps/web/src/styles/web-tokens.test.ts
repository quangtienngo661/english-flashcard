// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

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
  ['wrong-ink', 'wrong-soft'], ['accent', 'accent-soft'], ['ink', 'paper'], ['muted', 'paper'], ['accent', 'paper'],
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
    expect(tokens(web, 'shadow-wm').size).toBe(14);
  });

  it('pins the values the design names', () => {
    expect(light.get('accent')).toBe('#1e3a8a');
    expect(dark.get('accent')).toBe('#8da2ff');
    expect(tokens(web, 'radius-wm').get('button')).toBe('0.625rem');
    expect(tokens(web, 'radius-wm').get('xs')).toBe('0.1875rem');
    expect(tokens(web, 'text-wm').get('base')).toBe('1rem');
    // Labels, counts, keycaps and IPA (P.2): Noto Sans 12 / 1.4, weight 500; the mono token is gone.
    const text = tokens(web, 'text-wm');
    expect([text.get('meta'), text.get('meta--line-height'), text.get('meta--font-weight')]).toEqual(['0.75rem', '1.4', '500']);
    expect(text.has('mono')).toBe(false);
    expect(tokens(web, 'shadow-wm').get('btn')).toBe('0 0.625rem 1.75rem -0.625rem rgb(30 58 138 / 0.34)');
    // The Pro card of Gói học (M7 Figma B §1.1: 0 40 70 -40 rgba(27,36,68,.42)).
    expect(tokens(web, 'shadow-wm').get('pro')).toBe('0 2.5rem 4.375rem -2.5rem rgb(27 36 68 / 0.42)');
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

// The waiting dot of Đơn hàng (motion doc §6, design §8.2): opacity 1 → .3 → 1 in 1.4 s ease-in-out, until the order's status changes.
describe('wm pulse (M7.10)', () => {
  const globals = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');

  it('declares --animate-wm-pulse and its keyframes', () => {
    expect(tokens(web, 'animate-wm').get('pulse')).toBe('wm-pulse 1.4s ease-in-out infinite');
    expect(web).toMatch(/@keyframes wm-pulse \{\s*50% \{\s*opacity: 0\.3;\s*\}\s*\}/);
  });

  it('reduced motion runs every animation once for 0.01 ms, so the endless dot stands still', () => {
    const rule = /@media \(prefers-reduced-motion: reduce\) \{\s*html \{[^}]*\}\s*\*,\s*\*::before,\s*\*::after \{([^}]*)\}/.exec(globals);
    expect(rule?.[1]).toContain('animation-duration: 0.01ms !important;');
    expect(rule?.[1]).toContain('animation-iteration-count: 1 !important;');
  });
});

// M8.3: the public pages' raw Figma values (M8 Figma A §1–§3, B §2.5), as tokens in light and dark.
describe('wm public site tokens (M8.3)', () => {
  const shadow = tokens(web, 'shadow-wm');
  const text = tokens(web, 'text-wm');

  it('pins the three public shadows (Shadow/Lift; the hero stage 5:43; the Pro card 33:340)', () => {
    expect(shadow.get('lift')).toBe('0 3.125rem 6.875rem -2.5rem rgb(27 36 68 / 0.38), 0 0.75rem 2rem -1rem rgb(27 36 68 / 0.18)');
    expect(shadow.get('stage')).toBe('0 2.5rem 6.25rem -3.125rem rgb(30 58 138 / 0.3), 0 3.125rem 6.875rem -2.5rem rgb(27 36 68 / 0.38)');
    expect(shadow.get('pro-glow')).toBe(
      '0 0 3rem 0.125rem rgb(30 58 138 / 0.3), 0 2.5rem 6.25rem -3.125rem rgb(30 58 138 / 0.3), 0 3.125rem 6.875rem -2.5rem rgb(27 36 68 / 0.38)',
    );
  });

  it('pins the AI chip gradient and the halo colours, light and dark', () => {
    expect([light.get('ai-from'), light.get('ai-to')]).toEqual(['#1e3a8a', '#3d78ff']);
    expect([dark.get('ai-from'), dark.get('ai-to')]).toEqual(['#8da2ff', '#3d78ff']);
    expect([light.get('glow-accent'), light.get('glow-mark')]).toEqual(['rgb(30 58 138 / 0.28)', 'rgb(255 216 74 / 0.42)']);
    expect([dark.get('glow-accent'), dark.get('glow-mark')]).toEqual(['rgb(141 162 255 / 0.28)', 'rgb(255 216 74 / 0.42)']);
  });

  it('pins the site container (1160 px)', () => {
    expect(tokens(web, 'container-wm').get('site')).toBe('72.5rem');
  });

  it.each([
    ['site-hero', '5rem', '1.2', '-0.025em'],
    ['site-hero-mobile', '2.1875rem', '1.24', '-0.02em'],
    ['site-section', '3.25rem', '1.24', '-0.02em'],
    ['site-section-mobile', '1.875rem', '1.28', '-0.015em'],
    ['site-page', '4rem', '1.18', '-0.025em'],
    ['site-page-mobile', '2.375rem', '1.22', '-0.02em'],
    ['site-doc-heading', '1.75rem', '1.3', '-0.01em'],
  ])('pins --text-wm-%s: %s / %s / %s, Bold 700', (name, size, lineHeight, letterSpacing) => {
    expect([text.get(name), text.get(`${name}--line-height`), text.get(`${name}--letter-spacing`), text.get(`${name}--font-weight`)])
      .toEqual([size, lineHeight, letterSpacing, '700']);
  });
});

// M9.8: dark values, the new tokens whose light value equals an old literal, and the level colours.
describe('wm dark and level tokens (M9.8)', () => {
  const shadow = tokens(web, 'shadow-wm');
  const darkShadow = tokens(webDark, 'shadow-wm');
  const KEYS = [0, 1, 2, 3, 4, 5, 6, 'empty'] as const;
  const WASH = ['#38262d', '#172e38', '#272445', '#362f27', '#1f2f2c', '#352137', '#1a2c45', '#23293a'];
  const SOFT = ['#5d3231', '#164449', '#392f63', '#594624', '#28452e', '#572845', '#1d3f63', '#31384b'];

  it('keeps the old light literals for the new tokens', () => {
    expect([light.get('scrim'), light.get('paper'), light.get('paper-line'), light.get('halo-mark')])
      .toEqual(['rgb(27 36 68 / 0.3)', '#fbfaf6', '#e8e4d8', 'rgb(255 216 74 / 0.34)']);
    expect(shadow.get('paper')).toBe('0 1.5rem 3rem -1.75rem rgb(27 36 68 / 0.45)');
    expect(shadow.get('paper-card')).toBe('0 1.875rem 3.75rem -1.875rem rgb(27 36 68 / 0.55)');
    expect(shadow.get('contact')).toBe('0 0.0625rem 0.125rem rgb(27 36 68 / 0.06)');
  });

  it('pins the new tokens and the changed soft tints in dark', () => {
    expect([dark.get('scrim'), dark.get('paper'), dark.get('paper-line'), dark.get('halo-mark')])
      .toEqual(['rgb(0 0 0 / 0.55)', '#1e2334', '#2e3449', 'rgb(255 216 74 / 0.12)']);
    expect([dark.get('wrong-soft'), dark.get('wrong-line'), dark.get('wrong-ink')]).toEqual(['#352731', 'rgb(229 96 63 / 0.55)', '#e87052']);
    expect([light.get('wrong-soft'), light.get('wrong-line'), light.get('wrong-ink')]).toEqual(['#fbedeb', 'rgb(184 53 42 / 0.62)', '#b8352a']);
    expect([dark.get('accent-soft'), dark.get('pass-soft'), dark.get('fail-soft')]).toEqual(['#2c334f', '#24373c', '#3c2f3a']);
  });

  it('has a dark shadow for every light shadow, none in the light navy, and no button shadow', () => {
    expect([...darkShadow.keys()].sort()).toEqual([...shadow.keys()].sort());
    for (const [name, value] of darkShadow) {
      expect(value, name).not.toContain('27 36 68');
      expect(value, name).not.toContain('30 58 138');
    }
    for (const k of ['btn', 'btn-pass', 'btn-fail']) expect(darkShadow.get(k), k).toBe('none');
    expect(darkShadow.get('card')).toBe('0 0.0625rem 0.125rem rgb(0 0 0 / 0.4), 0 0.625rem 1.75rem -0.875rem rgb(0 0 0 / 0.6)');
    expect(darkShadow.get('paper')).toBe('0 1.5rem 3rem -1.75rem rgb(0 0 0 / 0.7)');
  });

  it('pins the raised dark group washes and softs', () => {
    KEYS.forEach((n, i) => {
      expect(dark.get(`group-${n}-wash`), `${n} wash`).toBe(WASH[i]);
      expect(dark.get(`group-${n}-soft`), `${n} soft`).toBe(SOFT[i]);
    });
  });

  it.each(KEYS)('dark group %s: ink reads on its wash and on the surface, and the title ink reads on the wash', (n) => {
    const map = new Map(dark);
    expect(contrast(map, `group-${n}-ink`, `group-${n}-wash`)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(map, `group-${n}-ink`, 'surface')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(map, 'ink', `group-${n}-wash`)).toBeGreaterThanOrEqual(4.5);
  });

  it('writes the level colours as #rrggbb in both files; light darkens with the level, dark brightens', () => {
    const names = ['level-0', 'level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'level-priority', 'level-due'];
    for (const map of [light, dark]) for (const k of names) expect(map.get(k), k).toMatch(/^#[0-9a-f]{6}$/);
    const lum = (map: Map<string, string>) => [1, 2, 3, 4, 5].map((n) => luminance(map.get(`level-${n}`) ?? ''));
    const strictly = (xs: number[], cmp: (a: number, b: number) => boolean) => xs.every((x, i) => i === 0 || cmp(xs[i - 1], x));
    expect(strictly(lum(light), (a, b) => a > b)).toBe(true);
    expect(strictly(lum(dark), (a, b) => a < b)).toBe(true);
  });

  it('sets color-scheme: dark first in the dark block', () => {
    expect(webDark).toMatch(/\[data-theme='dark'\] \{\s*color-scheme: dark;/);
  });
});
