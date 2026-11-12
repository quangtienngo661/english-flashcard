// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Part 10 P.2: labels use Noto Sans (the body font), cased in the message files, never by CSS.
const SRC = fileURLToPath(new URL('..', import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'app-ui' ? [] : files(path);
    return /\.(ts|tsx|css)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const sources = files(SRC).map((path) => ({ file: relative(SRC, path).split(sep).join('/'), text: readFileSync(path, 'utf8') }));

function hits(pattern: RegExp): string[] {
  return sources.flatMap(({ file, text }) => text.split('\n').flatMap((line, i) => (pattern.test(line) ? [`${file}:${i + 1}`] : [])));
}

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
