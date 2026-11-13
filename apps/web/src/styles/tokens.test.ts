import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// theme.css is admin's since P.6 (apps/web no longer imports it); the checks that still apply to it stay here, read from the package.
const themePath = createRequire(import.meta.url).resolve('@wordmet/design-tokens/theme.css');
const theme = readFileSync(themePath, 'utf8');
const globals = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');

function tokens(css: string, prefix: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+):\\s*([^;]+);`, 'g'))) out.set(m[1], m[2].trim());
  return out;
}

const colors = tokens(theme, 'color');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// session-card aliases canvas (as in Figma).
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

  it('LP31 theme.css radius and shadow tokens use rem', () => {
    const sized = ['radius', 'shadow'].flatMap((p) => [...tokens(theme, p)].map(([k, v]) => [`${p}-${k}`, v]));
    expect(sized).toHaveLength(11);
    expect(sized.filter(([, v]) => /\dpx/.test(v)).map(([k]) => k)).toEqual([]);
  });

  it('UBC1 apps/web declares no color tokens', () => {
    // Declarations only: using a shared colour through var(--color-…) is expected.
    expect(globals).not.toMatch(/--color-[a-z0-9-]+\s*:/);
  });
});

// A merge once dropped a closing brace in globals.css; jsdom tests never parse it, only the production build failed.
describe('globals.css syntax', () => {
  it('every block that opens also closes', () => {
    const code = globals.replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^'\n]*'|"[^"\n]*"/g, '');
    let depth = 0;
    for (const ch of code) {
      if (ch === '{') depth += 1;
      if (ch === '}') depth -= 1;
      expect(depth).toBeGreaterThanOrEqual(0);
    }
    expect(depth).toBe(0);
  });
});
