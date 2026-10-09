import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function queryLocalD1(sql: string): Array<Record<string, unknown>> {
  const output = execFileSync('pnpm', [
    'exec', 'wrangler', 'd1', 'execute', 'wordmet-waitlist', '--local', '--json', '--command', sql,
  ], {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const [result] = JSON.parse(output) as Array<{ results: Array<Record<string, unknown>> }>;
  return result.results;
}
