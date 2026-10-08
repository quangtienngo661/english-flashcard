import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');

function tokens(prefix: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of css.matchAll(new RegExp(`--${prefix}-([a-z0-9-]+):\\s*([^;]+);`, 'g'))) out.set(m[1], m[2].trim());
  return out;
}

const colors = tokens('color');

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(fg: string, bg: string): number {
  const a = colors.get(fg);
  const b = colors.get(bg);
  if (!a || !b) throw new Error(`missing color token ${a ? bg : fg}`);
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('design tokens', () => {
  it('LP12 text and control colors meet WCAG contrast', () => {
    const text: Array<[string, string]> = [
      ['ink', 'bg'], ['muted', 'bg'], ['muted', 'surface'], ['primary', 'surface'], ['on-primary', 'primary'],
      ['primary', 'primary-soft'], ['success-strong', 'success-soft'], ['success-strong', 'bg'],
      ['danger-strong', 'bg'], ['danger-strong', 'surface'], ['ink', 'marker'],
    ];
    const controls: Array<[string, string]> = [['border-strong', 'surface'], ['on-primary', 'primary']];
    const failures = [
      ...text.filter(([f, b]) => contrast(f, b) < 4.5).map(([f, b]) => `${f}/${b}=${contrast(f, b).toFixed(2)} < 4.5`),
      ...controls.filter(([f, b]) => contrast(f, b) < 3).map(([f, b]) => `${f}/${b}=${contrast(f, b).toFixed(2)} < 3`),
    ];
    expect(failures).toEqual([]);
  });

  it('LP31 size tokens use rem and the clamp tokens hit the Figma sizes', () => {
    const sized = ['text', 'radius', 'shadow', 'container'].flatMap((p) => [...tokens(p)].map(([k, v]) => [`${p}-${k}`, v]));
    expect(sized.length).toBeGreaterThan(20);
    expect(sized.filter(([, v]) => /\dpx/.test(v)).map(([k]) => k)).toEqual([]);

    const evalClamp = (value: string, width: number) => {
      const m = value.match(/clamp\(([\d.]+)rem,\s*([\d.]+)rem\s*\+\s*([\d.]+)vw,\s*([\d.]+)rem\)/);
      if (!m) throw new Error(`not a clamp: ${value}`);
      const [min, base, vw, max] = m.slice(1).map(Number);
      return Math.min(Math.max(base * 16 + (vw / 100) * width, min * 16), max * 16);
    };
    const text = tokens('text');
    const expected: Record<string, [number, number]> = { display: [36, 60], cta: [28, 44], h2: [28, 40] };
    for (const [name, [at390, at1440]] of Object.entries(expected)) {
      expect(evalClamp(text.get(name) ?? '', 390)).toBeCloseTo(at390, 0);
      expect(evalClamp(text.get(name) ?? '', 1440)).toBeCloseTo(at1440, 0);
    }
  });
});
