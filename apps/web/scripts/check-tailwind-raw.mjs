// W7 (spec §6.3): no Tailwind arbitrary values (`-[...]`) and no inline `style` in src/**/*.tsx,
// unless the line directly above carries `// raw-ok: <reason>`.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ARBITRARY = /(?<![\w-])[\w:.-]*-\[[^\]\s]+\][\w:/.-]*/g;
const INLINE_STYLE = /\bstyle=\{/g;

/** @returns {{ line: number, match: string }[]} */
export function findRawClasses(source) {
  const lines = source.split('\n');
  const found = [];
  lines.forEach((text, i) => {
    if (i > 0 && /\/\/\s*raw-ok:/.test(lines[i - 1])) return;
    for (const m of text.matchAll(ARBITRARY)) found.push({ line: i + 1, match: m[0] });
    for (const m of text.matchAll(INLINE_STYLE)) found.push({ line: i + 1, match: m[0] });
  });
  return found;
}

// Next.js image-generation files (next/og) only accept inline styles, not Tailwind classes.
const IMAGE_ROUTES = /^(opengraph-image|twitter-image|icon|apple-icon)\.tsx$/;

export function isChecked(fileName) {
  return fileName.endsWith('.tsx') && !fileName.endsWith('.test.tsx') && !IMAGE_ROUTES.test(fileName);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (isChecked(entry.name)) yield path;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const findings = [];
  for (const file of walk(join(root, 'src'))) {
    for (const f of findRawClasses(readFileSync(file, 'utf8'))) findings.push(`${relative(root, file)}:${f.line} ${f.match}`);
  }
  if (findings.length > 0) {
    console.error(`Raw Tailwind values or inline styles (add a token, or mark with // raw-ok: <reason>):\n${findings.join('\n')}`);
    process.exit(1);
  }
}
