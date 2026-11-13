// Finds keys in messages/vi.json that no source file reaches (LP3 keeps vi/en parity).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export function leafKeys(messages, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(messages)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) out.push(...leafKeys(v, key));
    else out.push(key);
  }
  return out;
}

const NS_PATTERNS = [
  /\b(?:useTranslations|getTranslations)\(\s*(['"`])([^'"`]*)\1\s*\)/g,
  /\bnamespace\s*:\s*(['"`])([^'"`]*)\1/g,
];

function namespacesOf(text) {
  const found = new Set();
  for (const re of NS_PATTERNS) for (const m of text.matchAll(re)) found.add(m[2]);
  if (/\b(?:useTranslations|getTranslations)\(\s*\)/.test(text)) found.add('');
  return found;
}

function allowMatches(entry, key) {
  if (entry.endsWith('.*')) {
    const prefix = entry.slice(0, -2);
    return key === prefix || key.startsWith(`${prefix}.`);
  }
  return entry === key;
}

export function findUnusedKeys({ messages, sources, allow }) {
  const keys = leafKeys(messages);
  const files = sources.map((s) => ({ ns: namespacesOf(s.text), text: s.text }));
  const isUsed = (key) => {
    const parts = key.split('.');
    for (let i = 0; i < parts.length; i++) {
      const p = parts.slice(0, i).join('.');
      const r = parts.slice(i).join('.');
      const quoted = [`'${r}'`, `"${r}"`, `\`${r}\``];
      if (files.some((f) => f.ns.has(p) && quoted.some((q) => f.text.includes(q)))) return true;
    }
    return false;
  };
  const unused = keys.filter((k) => !allow.some((a) => allowMatches(a.key, k)) && !isUsed(k)).sort();
  const staleAllow = allow.filter((a) => !keys.some((k) => allowMatches(a.key, k))).map((a) => a.key).sort();
  return { unused, staleAllow };
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.[^.]+$/.test(entry.name)) yield path;
  }
}

export function readRepoInput(root) {
  const messages = JSON.parse(readFileSync(join(root, 'messages/vi.json'), 'utf8'));
  const sources = [...walk(join(root, 'src'))].map((p) => ({ path: relative(root, p), text: readFileSync(p, 'utf8') }));
  const allow = JSON.parse(readFileSync(join(root, 'scripts/message-keys-allow.json'), 'utf8'));
  return { messages, sources, allow };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const input = readRepoInput(root);
  const { unused, staleAllow } = findUnusedKeys(input);
  if (unused.length > 0 || staleAllow.length > 0) {
    if (unused.length) console.error(`Unused message keys (delete them from vi.json and en.json, or add to scripts/message-keys-allow.json with a why):\n${unused.join('\n')}`);
    if (staleAllow.length) console.error(`Allow entries that match no key:\n${staleAllow.join('\n')}`);
    process.exit(1);
  }
  const total = leafKeys(input.messages).length;
  console.log(`message keys: ${total} used, 0 unused`);
}
