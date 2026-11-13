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

/** color-mix(in oklab, a p%, b) as #rrggbb, the way the browser mixes a level tint (mockup L165, L173). */
function mixOklab(a: string, b: string, p: number): string {
  const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const fromLin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  const oklab = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => toLin(parseInt(hex.slice(i, i + 2), 16) / 255));
    const [l, m, s] = [
      0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl,
      0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl,
      0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl,
    ].map(Math.cbrt);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  const [x, y] = [oklab(a), oklab(b)];
  const [L, A, B] = x.map((v, i) => v * p + y[i] * (1 - p));
  const [l, m, s] = [L + 0.3963377774 * A + 0.2158037573 * B, L - 0.1055613458 * A - 0.0638541728 * B, L - 0.0894841775 * A - 1.291485548 * B]
    .map((v) => v ** 3);
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, fromLin(c))) * 255).toString(16).padStart(2, '0')).join('')}`;
}

const TEXT_PAIRS: Array<[string, string]> = [
  ['ink', 'bg'], ['ink', 'surface'], ['muted', 'bg'], ['muted', 'surface'], ['on-accent', 'accent'], ['accent', 'surface'],
  ['pass', 'pass-soft'], ['fail', 'fail-soft'], ['mark-ink', 'mark'],
  ['wrong-ink', 'wrong-soft'], ['accent', 'accent-soft'],
  // F.14: the result ticket's text on its wash (the muted note, the answer word, the meaning).
  ['muted', 'wrong-soft'], ['ink', 'wrong-soft'], ['muted', 'pass-soft'], ['ink', 'pass-soft'], ['ink', 'paper'], ['muted', 'paper'], ['accent', 'paper'],
  // P.1: the row states "đến hạn" (warn) and "ưu tiên" (level-priority) are text (mockup L375), on cards and on the page.
  ['warn', 'surface'], ['warn', 'bg'], ['level-priority', 'surface'], ['pass', 'surface'],
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
    expect(tokens(web, 'radius-wm').size).toBe(6);
    expect(tokens(web, 'shadow-wm').size).toBe(14);
  });

  it('pins the values the design names', () => {
    expect(light.get('accent')).toBe('#1e3a8a');
    expect(dark.get('accent')).toBe('#8da2ff');
    // Radius scale C by element role (P.3; mockup L81-82): inner is always smaller than its container.
    expect(Object.fromEntries(tokens(web, 'radius-wm')))
      .toEqual({ key: '0.25rem', control: '0.5rem', row: '0.625rem', card: '0.875rem', dialog: '1rem', pill: '62.4375rem' });
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

  it('pins the section title sizes (P.4, mockup L126-127: Bricolage 700, 22 / 20, line-height 1.25, -0.012em)', () => {
    const text = tokens(web, 'text-wm');
    const style = (name: string) => ['', '--line-height', '--letter-spacing', '--font-weight'].map((k) => text.get(`${name}${k}`));
    expect(style('block-title')).toEqual(['1.375rem', '1.25', '-0.012em', '700']);
    expect(style('block-title-mobile')).toEqual(['1.25rem', '1.25', '-0.012em', '700']);
  });

  it('F.14: the answer word on the wrong ticket reaches 4.5:1 in both themes', () => {
    // Owner 13/11/2026: fail at 12 % gave #fae7e4, 4.495:1 for pass; 11.5 % gives #fae8e6, 4.53:1.
    expect(contrast(light, 'pass', 'wrong-soft')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark, 'pass', 'wrong-soft')).toBeGreaterThanOrEqual(4.5);
  });

  it('pins the result ticket type (F.14: Bricolage 800, 1.25rem title, 1.7rem lead)', () => {
    const text = tokens(web, 'text-wm');
    const style = (name: string) => ['', '--line-height', '--letter-spacing', '--font-weight'].map((k) => text.get(`${name}${k}`));
    expect(style('ticket-title')).toEqual(['1.25rem', '1.2', '-0.01em', '800']);
    expect(style('ticket-lead')).toEqual(['1.7rem', '1.1', '-0.02em', '800']);
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

describe('wm group and motion tokens (M3)', () => {
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
    expect(ease.get('carousel')).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
    expect(ease.get('flip')).toBe('cubic-bezier(0.3, 1.15, 0.5, 1)');
    expect(ease.get('rise')).toBe('cubic-bezier(0.3, 1.3, 0.5, 1)');
    expect(ease.get('count')).toBe('cubic-bezier(0.3, 1.4, 0.5, 1)');
    const ms = tokens(web, 'transition-duration-wm');
    expect(Object.fromEntries(['carousel', 'fade', 'blur', 'halo', 'rise', 'count', 'flip', 'page-in', 'lift'].map((k) => [k, ms.get(k)])))
      .toEqual({ carousel: '660ms', fade: '450ms', blur: '500ms', halo: '700ms', rise: '460ms', count: '520ms', flip: '380ms', 'page-in': '340ms', lift: '170ms' });
  });

  it('P.6: the strong ease-out and the kit curves keep the values they had in globals.css and theme.css', () => {
    const ease = tokens(web, 'ease-wm');
    expect(Object.fromEntries(['out-strong', 'standard', 'enter', 'exit', 'spring'].map((k) => [k, ease.get(k)]))).toEqual({
      'out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)',
      standard: 'cubic-bezier(0.2, 0, 0, 1)',
      enter: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
      exit: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    });
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
    // F.14: the result ticket's wash is fail 11.5 % on surface (oklab; 12 % left pass at 4.495:1); its line fail at 55 %.
    expect([light.get('wrong-soft'), light.get('wrong-line'), light.get('wrong-ink')]).toEqual(['#fae8e6', 'rgb(184 53 42 / 0.55)', '#b8352a']);
    expect(mixOklab(light.get('fail')!, light.get('surface')!, 0.115)).toBe(light.get('wrong-soft'));
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

  // The M9 minor: pin the exact level hexes once the polish uses them (mockup L80 light, L93 dark).
  it('pins the eight level colours, light and dark', () => {
    const names = ['level-0', 'level-1', 'level-2', 'level-3', 'level-4', 'level-5', 'level-priority', 'level-due'];
    expect(names.map((k) => light.get(k))).toEqual(['#a3abbd', '#b9e4c7', '#7ccd9b', '#3fae6c', '#218c4f', '#106a39', '#c4372c', '#e0a21b']);
    expect(names.map((k) => dark.get(k))).toEqual(['#56607a', '#1f4d35', '#27704a', '#319c60', '#4cc283', '#8ae4b0', '#ff8d80', '#f0c04a']);
  });

  it('pins the warn colour (QP4: the mockup amber #b07a12 darkened, same hue, to reach 4.5:1 on surface and bg; dark #f0c04a)', () => {
    expect([light.get('warn'), dark.get('warn')]).toEqual(['#97680f', '#f0c04a']);
  });

  // A level chip is ink on the level mixed into the surface: 18 % at rest, 40 % when chosen (mockup L165, L173).
  it.each([['light', light], ['dark', dark]] as const)('ink reads at 4.5:1 on every level tint in %s', (_mode, map) => {
    const surface = map.get('surface') ?? '';
    const below = ['0', '1', '2', '3', '4', '5', 'priority', 'due'].flatMap((n) => [18, 40].map((p) => {
      const tint = mixOklab(map.get(`level-${n}`) ?? '', surface, p / 100);
      const ratio = contrast(new Map([['ink', map.get('ink') ?? ''], ['tint', tint]]), 'ink', 'tint');
      return ratio < 4.5 ? `level-${n} ${p}% (${tint})=${ratio.toFixed(2)}` : null;
    })).filter(Boolean);
    expect(below).toEqual([]);
  });

  // P.4: LevelChip reads its tints from tokens (precomputed oklab mixes, mockup L165, L173). `all` mixes the accent.
  const TONES = ['0', '1', '2', '3', '4', '5', 'priority', 'due', 'all'];
  it.each([['light', light], ['dark', dark]] as const)('the level tint tokens are the oklab mixes, and ink reads at 4.5:1 on them in %s', (_mode, map) => {
    const surface = map.get('surface') ?? '';
    const base = (tone: string) => map.get(tone === 'all' ? 'accent' : `level-${tone}`) ?? '';
    expect(TONES.map((tone) => map.get(`level-${tone}-tint`))).toEqual(TONES.map((tone) => mixOklab(base(tone), surface, 0.18)));
    expect(TONES.map((tone) => map.get(`level-${tone}-tint-strong`))).toEqual(TONES.map((tone) => mixOklab(base(tone), surface, 0.4)));
    const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
    expect(TONES.map((tone) => map.get(`level-${tone}-line`))).toEqual(TONES.map((tone) => `rgb(${hex(base(tone))} / 0.45)`));
    const below = TONES.flatMap((tone) => ['tint', 'tint-strong'].map((k) => [tone, k, contrast(map, 'ink', `level-${tone}-${k}`)] as const))
      .filter(([, , ratio]) => ratio < 4.5)
      .map(([tone, k, ratio]) => `level-${tone}-${k}=${ratio.toFixed(2)}`);
    expect(below).toEqual([]);
  });

  it('mixes in oklab like the browser (checked against the dark pass-soft token, #62c98f 18 % on #171b2a)', () => {
    expect(mixOklab('#62c98f', '#171b2a', 0.18)).toBe(dark.get('pass-soft'));
    expect(mixOklab('#8da2ff', '#171b2a', 0.2)).toBe(dark.get('accent-soft'));
  });

  it('sets color-scheme: dark first in the dark block', () => {
    expect(webDark).toMatch(/\[data-theme='dark'\] \{\s*color-scheme: dark;/);
  });
});
