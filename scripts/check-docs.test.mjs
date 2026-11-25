import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { checkDocs } from './check-docs.mjs';

function makeTempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'check-docs-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.test'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  return dir;
}

describe('checkDocs', () => {
  it('flags missing relative markdown links and missing backticked repo paths, and ignores valid/external/anchor links', () => {
    const dir = makeTempRepo();
    try {
      mkdirSync(join(dir, 'apps', 'api'), { recursive: true });
      mkdirSync(join(dir, 'docs'), { recursive: true });
      writeFileSync(join(dir, 'apps', 'api', 'real.ts'), 'export const x = 1;\n');
      writeFileSync(join(dir, 'docs', 'real.md'), '# Real\n');
      writeFileSync(
        join(dir, 'README.md'),
        [
          '# Sample',
          'Missing link: [broken](docs/missing.md)',
          'Tracked link: [ok](docs/real.md#section)',
          'External link: [web](https://example.test/page)',
          'Anchor link: [jump](#sample)',
          'Missing backtick path: `apps/api/missing.ts`',
          'Tracked backtick path with line: `apps/api/real.ts:12`',
          '',
        ].join('\n'),
      );
      execFileSync('git', ['add', '.'], { cwd: dir });

      const findings = checkDocs(dir, ['README.md']);
      assert.deepEqual(findings, [
        { file: 'README.md', line: 2, target: 'docs/missing.md' },
        { file: 'README.md', line: 6, target: 'apps/api/missing.ts' },
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
