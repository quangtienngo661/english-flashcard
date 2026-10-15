// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PANEL_SPLIT_QUERY } from '../ui/DetailPanel';

// Shared tokens come from the workspace package (design UB3); resolving it here also proves apps/admin can import it.
const themePath = createRequire(import.meta.url).resolve('@wordmet/design-tokens/theme.css');
const theme = readFileSync(themePath, 'utf8');
const globals = readFileSync(fileURLToPath(new URL('./globals.css', import.meta.url)), 'utf8');

const colors = new Map<string, string>();
for (const m of theme.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)) colors.set(m[1], m[2]);

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

const below = (pairs: Array<[string, string]>, min: number) =>
  pairs.filter(([f, b]) => contrast(f, b) < min).map(([f, b]) => `${f}/${b}=${contrast(f, b).toFixed(2)} < ${min}`);

describe('admin design tokens', () => {
  it('UBC1 apps/admin declares no colour', () => {
    // Using a shared colour through var(--color-…) is expected; declaring one, or writing a raw colour, is not.
    expect(globals).not.toMatch(/--color-[a-z0-9-]+\s*:/);
    expect(globals).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
  });

  it('UBC2 admin text pairs reach 4.5:1', () => {
    const text: Array<[string, string]> = [
      ['ink', 'surface'], ['ink', 'canvas'], ['ink', 'primary-soft'], ['ink', 'accent'], ['ink', 'accent-soft'], ['ink', 'neutral-soft'],
      ['muted', 'surface'], ['muted', 'canvas'], ['muted', 'primary-soft'], ['muted', 'accent-soft'], ['muted', 'neutral-soft'], ['muted', 'danger-soft'],
      ['primary', 'surface'], ['primary', 'primary-soft'], ['on-primary', 'primary'], ['on-primary', 'danger'], ['on-primary', 'ink'], ['accent', 'ink'],
      ['success', 'success-soft'], ['warning', 'accent-soft'], ['danger', 'surface'], ['danger', 'danger-soft'],
      ['placeholder', 'surface'], ['placeholder', 'canvas'],
    ];
    expect(below(text, 4.5)).toEqual([]);
  });

  it('UBC2 admin control and focus pairs reach 3:1', () => {
    const controls: Array<[string, string]> = [
      ['border-strong', 'surface'], ['border-strong', 'canvas'], ['border-strong', 'primary-soft'],
      ['primary', 'surface'], ['primary', 'canvas'], ['accent', 'primary'],
    ];
    expect(below(controls, 3)).toEqual([]);
  });

  it('PANEL_SPLIT_QUERY matches --breakpoint-panel in globals.css (UB22)', () => {
    const breakpoint = globals.match(/--breakpoint-panel:\s*([\d.]+rem);/)?.[1];
    expect(PANEL_SPLIT_QUERY).toBe(`(min-width: ${breakpoint})`);
  });

  it('the package declares danger-deep and canvas-deep', () => {
    expect(colors.get('danger-deep')).toBe('#8a2219');
    expect(colors.get('canvas-deep')).toBe('#dde1f5');
  });
});
