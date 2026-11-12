// @vitest-environment node
import { hits, sources } from './scan-src';

// Part 10 P.2: labels use Noto Sans (the body font), cased in the message files, never by CSS.
describe('no mono font, no CSS case transforms (P.2)', () => {
  it('scans real files (control)', () => {
    expect(sources.length).toBeGreaterThan(100);
    expect(hits(/font-wm-sans/).length).toBeGreaterThan(0);
  });

  it.each([
    ['font-wm-mono', /font-wm-mono/],
    ['text-wm-mono', /text-wm-mono/],
    ['JetBrains', /JetBrains/],
    ['a case-transform class', /(?<![\w'-])(?:lowercase|uppercase)(?![\w'-])|first-letter:/],
  ])('no %s in src', (_name, pattern) => {
    expect(hits(pattern)).toEqual([]);
  });

  it('layout.tsx imports exactly Noto_Sans and Bricolage_Grotesque from next/font/google', () => {
    const layout = sources.find((s) => s.file === 'app/[locale]/layout.tsx')?.text ?? '';
    const match = /import \{([^}]*)\} from 'next\/font\/google'/.exec(layout);
    const names = (match?.[1] ?? '').split(',').map((n) => n.trim()).filter(Boolean).sort();
    expect(names).toEqual(['Bricolage_Grotesque', 'Noto_Sans']);
  });
});
