import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Shared tokens come from the workspace package (spec UB3); resolving it here also proves apps/web can import it.
const themePath = createRequire(import.meta.url).resolve('@wordmet/design-tokens/theme.css');
const theme = readFileSync(themePath, 'utf8');
// Dark values for the learner app (design §4.4, D3): a separate file so admin and the landing never see them.
const dark = readFileSync(createRequire(import.meta.url).resolve('@wordmet/design-tokens/dark.css'), 'utf8');
const globals = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');

function tokens(css: string, prefix: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+):\\s*([^;]+);`, 'g'))) out.set(m[1], m[2].trim());
  return out;
}

const lightColors = tokens(theme, 'color');
const darkColors = tokens(dark, 'color');
let colors = lightColors;

// The learner app's colours (Figma variables, collection "Wordmet B"): text pairs and control pairs it relies on.
const APP_TEXT: Array<[string, string]> = [
  ['ink', 'surface'], ['ink', 'canvas'], ['muted', 'surface'], ['muted', 'canvas'], ['placeholder', 'surface'],
  ['on-navy', 'navy'], ['on-navy', 'navy-raised'], ['on-navy-muted', 'navy'], ['ink', 'highlight'], ['ink', 'session-card'],
  ['on-accent', 'accent'], ['on-primary', 'primary'], ['primary', 'surface'], ['primary', 'primary-soft'],
  ['success', 'surface'], ['success', 'success-soft'], ['danger', 'surface'], ['danger', 'danger-soft'], ['warning', 'surface'],
];
const APP_CONTROLS: Array<[string, string]> = [
  ['border-strong', 'surface'], ['border-strong', 'canvas'], ['primary', 'surface'], ['primary', 'canvas'], ['accent', 'navy'],
];

const below = (pairs: Array<[string, string]>, min: number) =>
  pairs.filter(([f, b]) => contrast(f, b) < min).map(([f, b]) => `${f}/${b}=${contrast(f, b).toFixed(2)} < ${min}`);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// session-card aliases canvas in light mode (as in Figma).
function hexOf(name: string): string | undefined {
  const value = colors.get(name);
  const alias = value?.match(/^var\(--color-([a-z0-9-]+)\)$/);
  return alias ? hexOf(alias[1]) : value;
}

function contrast(fg: string, bg: string): number {
  const a = hexOf(fg);
  const b = hexOf(bg);
  if (!a || !b) throw new Error(`missing color token ${a ? bg : fg}`);
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('design tokens', () => {
  it('LP12 text and control colors meet WCAG contrast', () => {
    const text: Array<[string, string]> = [
      ['ink', 'surface'], ['ink', 'canvas'], ['ink', 'accent'], ['ink', 'accent-soft'], ['ink', 'wrong-chip'],
      ['muted', 'surface'], ['muted', 'canvas'], ['muted', 'primary-soft'], ['muted', 'accent'],
      ['primary', 'surface'], ['primary', 'primary-soft'], ['on-primary', 'primary'], ['on-primary-muted', 'primary'],
      ['success', 'surface'], ['success', 'success-soft'], ['danger', 'surface'], ['danger', 'danger-soft'],
      ['warning', 'accent-soft'], ['placeholder', 'surface'], ['placeholder', 'canvas'],
    ];
    const controls: Array<[string, string]> = [
      ['border-strong', 'surface'], ['border-strong', 'canvas'], ['on-primary', 'primary'], ['ink', 'accent'],
      ['accent', 'primary'], ['primary', 'accent'], ['primary', 'surface'],
      // Flagged consent boxes: yellow on the blue field, red on the yellow band (A11Y-5).
      ['danger', 'accent'],
    ];
    const failures = [
      ...text.filter(([f, b]) => contrast(f, b) < 4.5).map(([f, b]) => `${f}/${b}=${contrast(f, b).toFixed(2)} < 4.5`),
      ...controls.filter(([f, b]) => contrast(f, b) < 3).map(([f, b]) => `${f}/${b}=${contrast(f, b).toFixed(2)} < 3`),
    ];
    expect(failures).toEqual([]);
  });

  it('D3: every light colour has a dark value', () => {
    expect([...lightColors.keys()].filter((k) => !darkColors.has(k))).toEqual([]);
    expect([...darkColors.keys()].filter((k) => !lightColors.has(k))).toEqual([]);
  });

  it('the learner app colours meet WCAG contrast in light and dark', () => {
    for (const [mode, map] of [['light', lightColors], ['dark', darkColors]] as const) {
      colors = map;
      expect([...below(APP_TEXT, 4.5), ...below(APP_CONTROLS, 3)].map((f) => `${mode}: ${f}`)).toEqual([]);
    }
    colors = lightColors;
  });

  it('LP31 size tokens use rem and the clamp tokens hit the Figma sizes', () => {
    const sized = [
      ...['text', 'container'].flatMap((p) => [...tokens(globals, p)].map(([k, v]) => [`${p}-${k}`, v])),
      ...['radius', 'shadow'].flatMap((p) => [...tokens(theme, p)].map(([k, v]) => [`${p}-${k}`, v])),
    ];
    expect(sized.length).toBeGreaterThan(20);
    expect(sized.filter(([, v]) => /\dpx/.test(v)).map(([k]) => k)).toEqual([]);

    const evalClamp = (value: string, width: number) => {
      const m = value.match(/clamp\(([\d.]+)rem,\s*([\d.]+)rem\s*\+\s*([\d.]+)vw,\s*([\d.]+)rem\)/);
      if (!m) throw new Error(`not a clamp: ${value}`);
      const [min, base, vw, max] = m.slice(1).map(Number);
      return Math.min(Math.max(base * 16 + (vw / 100) * width, min * 16), max * 16);
    };
    const text = tokens(globals, 'text');
    const expected: Record<string, [number, number]> = { display: [36, 60], cta: [28, 44], h2: [28, 40] };
    for (const [name, [at390, at1440]] of Object.entries(expected)) {
      expect(evalClamp(text.get(name) ?? '', 390)).toBeCloseTo(at390, 0);
      expect(evalClamp(text.get(name) ?? '', 1440)).toBeCloseTo(at1440, 0);
    }
  });

  it('UBC1 apps/web declares no color tokens', () => {
    // Declarations only: using a shared colour through var(--color-…) is expected.
    expect(globals).not.toMatch(/--color-[a-z0-9-]+\s*:/);
  });
});

// dark-pastel.css: a variant kept for later, not imported (owner 27/10/2026). Its light islands must stay readable.
describe('pastel dark variant (not on)', () => {
  const pastel = readFileSync(createRequire(import.meta.url).resolve('@wordmet/design-tokens/dark-pastel.css'), 'utf8');
  const island = pastel.slice(pastel.indexOf(':is(.bg-primary-soft'));

  it('is not imported by the app', () => {
    expect(globals).not.toContain('dark-pastel.css');
  });

  it('text on its pastel surfaces meets 4.5:1', () => {
    colors = new Map([...darkColors, ...tokens(island.slice(0, island.indexOf('}') + 1), 'color')]);
    const pairs: Array<[string, string]> = ['ink', 'muted', 'primary', 'success', 'danger', 'warning'].flatMap((fg) =>
      ['primary-soft', 'accent-soft', 'success-soft', 'danger-soft', 'neutral-soft'].map((bg) => [fg, bg] as [string, string]));
    expect(below(pairs, 4.5)).toEqual([]);
    colors = lightColors;
  });
});

// island.css: the light islands the app uses in the dark theme (owner 27/10/2026), and the darker navy card.
describe('light islands and the navy card', () => {
  const islandCss = readFileSync(createRequire(import.meta.url).resolve('@wordmet/design-tokens/island.css'), 'utf8');

  it('the app imports island.css', () => {
    expect(globals).toContain("@import '@wordmet/design-tokens/island.css'");
  });

  it('text on an island surface meets 4.5:1 in the dark theme', () => {
    colors = new Map([...darkColors, ...tokens(islandCss.slice(0, islandCss.indexOf('}') + 1), 'color')]);
    const pairs: Array<[string, string]> = ['ink', 'muted', 'primary', 'success', 'danger', 'warning'].flatMap((fg) =>
      ['primary-soft', 'accent-soft', 'success-soft', 'danger-soft', 'surface'].map((bg) => [fg, bg] as [string, string]));
    expect(below(pairs, 4.5)).toEqual([]);
    colors = lightColors;
  });

  it('on-navy and on-navy-muted read on navy-card in both themes', () => {
    for (const map of [lightColors, darkColors]) {
      colors = map;
      expect(below([['on-navy', 'navy-card'], ['on-navy-muted', 'navy-card'], ['on-navy', 'navy-raised']], 4.5)).toEqual([]);
    }
    colors = lightColors;
  });
});
