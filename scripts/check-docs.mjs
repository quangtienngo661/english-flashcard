/**
 * Documentation link and path checker for the four core documents:
 *   - README.md
 *   - CLAUDE.md
 *   - deploy/README.md
 *   - docs/ARCHITECTURE.md
 *
 * Historical records under `docs/deliveries/**` and `docs/audit/**` are intentionally
 * NOT covered by this script.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CORE_DOC_FILES = [
  'README.md',
  'CLAUDE.md',
  'deploy/README.md',
  'docs/ARCHITECTURE.md',
];

const REPO_PATH_RE = /`((?:apps|deploy|docs|scripts|packages)\/[^`\s]+)`/g;
const MD_LINK_RE = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const TEMPLATE_CHARS_RE = /[*<>{}$?]|…|\.\.\./;

function loadTracked(rootDir) {
  const out = execFileSync('git', ['-C', rootDir, 'ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  const files = new Set();
  const dirs = new Set();
  for (const raw of out.split('\0')) {
    if (!raw) continue;
    const norm = raw.replaceAll('\\', '/');
    files.add(norm);
    const parts = norm.split('/');
    for (let i = 1; i < parts.length; i += 1) {
      dirs.add(parts.slice(0, i).join('/'));
    }
  }
  return { files, dirs };
}

function cleanTarget(raw) {
  return raw
    .split('#')[0]
    .replace(/:\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/, '')
    .replace(/[.,;)]+$/, '')
    .replace(/\/+$/, '');
}

export function checkDocs(rootDir, files = CORE_DOC_FILES) {
  const tracked = loadTracked(rootDir);
  const findings = [];

  for (const file of files) {
    const absPath = resolve(rootDir, file);
    const content = readFileSync(absPath, 'utf8');
    const lines = content.split(/\r?\n/);
    const fileDir = posix.dirname(file.replaceAll('\\', '/'));
    let inFence = false;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (/^\s*(?:```|~~~)/.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;

      const lineNo = i + 1;

      MD_LINK_RE.lastIndex = 0;
      let match;
      while ((match = MD_LINK_RE.exec(line)) !== null) {
        const raw = match[1];
        if (/^(?:https?:|mailto:|#)/i.test(raw)) continue;
        if (TEMPLATE_CHARS_RE.test(raw)) continue;
        const cleaned = cleanTarget(raw);
        if (!cleaned) continue;
        const resolved = posix.normalize(fileDir === '.' ? cleaned : posix.join(fileDir, cleaned));
        if (!tracked.files.has(resolved) && !tracked.dirs.has(resolved)) {
          findings.push({ file, line: lineNo, target: raw });
        }
      }

      REPO_PATH_RE.lastIndex = 0;
      while ((match = REPO_PATH_RE.exec(line)) !== null) {
        const raw = match[1];
        if (TEMPLATE_CHARS_RE.test(raw)) continue;
        const cleaned = cleanTarget(raw);
        if (!cleaned) continue;
        const resolved = posix.normalize(cleaned);
        if (!tracked.files.has(resolved) && !tracked.dirs.has(resolved)) {
          findings.push({ file, line: lineNo, target: raw });
        }
      }
    }
  }

  return findings;
}

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const findings = checkDocs(rootDir, CORE_DOC_FILES);
  if (findings.length > 0) {
    for (const f of findings) {
      console.error(`${f.file}:${f.line}: ${f.target}`);
    }
    process.exit(1);
  }
  console.log(`check-docs: OK (${CORE_DOC_FILES.length} core documents checked, 0 findings)`);
}
