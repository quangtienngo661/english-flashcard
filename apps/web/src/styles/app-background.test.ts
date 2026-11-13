import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Owner 10/11/2026 (QBG): the app background is "Mesh + hạt" (round 8, direction 4): four colour halos and a grain layer,
// cards stay white.
const globals = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');

function block(name: string): string | null {
  const start = globals.indexOf(`@utility ${name} {`);
  if (start < 0) return null;
  let depth = 0;
  for (let i = globals.indexOf('{', start); i < globals.length; i += 1) {
    if (globals[i] === '{') depth += 1;
    if (globals[i] === '}') depth -= 1;
    if (depth === 0) return globals.slice(start, i + 1);
  }
  return null;
}

describe('app background', () => {
  it('is four halos in accent, the mark token, pass and accent over the page colour', () => {
    const css = block('app-mesh');
    expect(css).not.toBeNull();
    expect(css).toContain('background-color: var(--color-wm-bg)');
    const halos = [...css!.matchAll(/radial-gradient\([^;]*?var\(--color-wm-([a-z-]+)\) (\d+)%/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(halos).toEqual(['accent 20', 'pass 18', 'accent 12']);
    // The yellow halo is a token, so dark can dim it (M9.8); it sits second.
    const lines = css!.split('\n').filter((l) => l.includes('radial-gradient'));
    expect(lines).toHaveLength(4);
    expect(lines[1]).toContain('var(--color-wm-halo-mark)');
  });

  it('has a grain layer drawn by an SVG turbulence filter at 40% multiply', () => {
    const css = block('app-mesh')!;
    expect(css).toContain('feTurbulence');
    expect(css).toMatch(/opacity:\s*0?\.4;/);
    expect(css).toMatch(/mix-blend-mode:\s*multiply/);
  });

  it('has a dark grain of soft-light at 7% from the same turbulence without the colour matrix', () => {
    const css = block('app-mesh')!;
    const dark = css.slice(css.indexOf("html[data-theme='dark'] &::before"));
    expect(dark).toContain('mix-blend-mode: soft-light');
    expect(dark).toMatch(/opacity:\s*0\.07;/);
    expect(dark).toContain('feTurbulence');
    expect(dark).not.toContain('feColorMatrix');
  });
});
