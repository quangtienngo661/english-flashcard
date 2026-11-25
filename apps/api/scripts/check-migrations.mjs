import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const OVERRIDE_RE = /^--\s*destructive-ok:\s*\S+/m;

const PATTERNS = [
  /DROP\s+TABLE\b/gi,
  /DROP\s+COLUMN\b/gi,
  /SET\s+NOT\s+NULL\b/gi,
  /\bRENAME\b/gi,
  /ALTER\s+COLUMN\s+\S+\s+(?:SET\s+DATA\s+)?TYPE\b/gi,
];

/**
 * Returns every destructive DDL match in `sql`, or `[]` when a `-- destructive-ok: <reason>` marker line is present.
 * @param {string} sql
 * @returns {string[]}
 */
export function findDestructive(sql) {
  if (OVERRIDE_RE.test(sql)) return [];
  const stripped = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
  /** @type {string[]} */
  const findings = [];
  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(stripped)) !== null) {
      findings.push(match[0]);
    }
  }
  return findings;
}

function main() {
  const baseRef = process.argv[2];
  if (!baseRef) {
    console.error('usage: node scripts/check-migrations.mjs <base-ref>');
    process.exitCode = 2;
    return;
  }

  const out = execFileSync(
    'git',
    ['diff', '--name-only', '--diff-filter=A', `${baseRef}...HEAD`, '--', 'prisma/migrations'],
    { encoding: 'utf8' },
  );

  const files = out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.endsWith('migration.sql'));

  const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  let bad = 0;
  for (const rel of files) {
    const sql = readFileSync(resolve(repoRoot, rel), 'utf8');
    for (const hit of findDestructive(sql)) {
      console.log(`${rel}: ${hit}`);
      bad++;
    }
  }

  if (bad > 0) {
    process.exitCode = 1;
  }
}

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  main();
}
