// Runs the real built API and the real worker process together, for manual/smoke testing
// against the actual HTTP boundary (not createTestApp()). Requires `pnpm build` first.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const children = [];
let shuttingDown = false;

function requireBuilt(file, hint) {
  if (!existsSync(file)) {
    console.error(`Missing ${file}; run \`pnpm build\` first.`);
    process.exit(1);
  }
  void hint;
}

requireBuilt('dist/main.js');
requireBuilt('dist/worker.js');

function run(label, args) {
  const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  const prefix = `[${label}]`;
  const forward = (stream) => (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.length) stream.write(`${prefix} ${line}\n`);
    }
  };
  child.stdout.on('data', forward(process.stdout));
  child.stderr.on('data', forward(process.stderr));
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`${prefix} exited early (code=${code}, signal=${signal}); shutting down the other process.`);
    shutdown(1);
  });
  return child;
}

function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(exitCode), 500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('api', ['dist/main.js']);
run('worker', ['dist/worker.js']);

console.log('API + worker running. Ctrl+C to stop both.');
