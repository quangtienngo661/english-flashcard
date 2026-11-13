import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Shared by the source-scan tests (no-mono, radius-classes): every non-test .ts/.tsx/.css file under src.
const SRC = fileURLToPath(new URL('..', import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx|css)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

export const sources = files(SRC).map((path) => ({ file: relative(SRC, path).split(sep).join('/'), text: readFileSync(path, 'utf8') }));

/** `file:line` of every source line that matches. */
export function hits(pattern: RegExp): string[] {
  return sources.flatMap(({ file, text }) => text.split('\n').flatMap((line, i) => (pattern.test(line) ? [`${file}:${i + 1}`] : [])));
}
