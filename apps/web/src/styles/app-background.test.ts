import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Owner 10/11/2026 (QBG): the app background is "Mesh + hạt" (round 8, direction 4): four colour halos and a grain layer,
// cards stay white. The dot grid of round 9 is gone.
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
  it('has no dot grid any more', () => {
    expect(block('dot-grid')).toBeNull();
    expect(globals).not.toMatch(/background-size:\s*1\.25rem 1\.25rem/);
  });

  it('is four halos in accent, mark, pass and accent over the page colour', () => {
    const css = block('app-mesh');
    expect(css).not.toBeNull();
    expect(css).toContain('background-color: var(--color-wm-bg)');
    const halos = [...css!.matchAll(/radial-gradient\([^;]*?var\(--color-wm-([a-z-]+)\) (\d+)%/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(halos).toEqual(['accent 20', 'mark 34', 'pass 18', 'accent 12']);
  });

  it('has a grain layer drawn by an SVG turbulence filter at 40% multiply', () => {
    const css = block('app-mesh')!;
    expect(css).toContain('feTurbulence');
    expect(css).toMatch(/opacity:\s*0?\.4;/);
    expect(css).toMatch(/mix-blend-mode:\s*multiply/);
  });
});
