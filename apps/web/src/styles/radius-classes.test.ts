// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Part 10 P.3: radius classes name an element role (key, control, row, card, dialog, pill), never the old sizes.
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

describe('radius classes (P.3)', () => {
  it('scans real files (control)', () => {
    expect(hits(/rounded-wm-(?:key|control|row|card|dialog|pill)/).length).toBeGreaterThan(200);
  });

  it('no size-named wm radius left', () => {
    expect(hits(/rounded(?:-[tblr])?-wm-(?:xs|sm|md|lg|xl|2xl|button|modal)(?![\w-])/)).toEqual([]);
  });

  it('no Tailwind default or old-theme radius class left', () => {
    expect(hits(/(?<![\w-])rounded(?:-[tblr])?-(?:xs|sm|lg|control|card|inner)(?![\w-])/)).toEqual([]);
  });

  it('no arbitrary radius', () => {
    expect(hits(/rounded(?:-[tblr])?-\[/)).toEqual([]);
  });
});
