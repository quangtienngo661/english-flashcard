// `pnpm dev:app`: the learner app in dev mode on :3001 (design §14.5) with the app flag on and the local API, unless the
// environment already sets them. On Windows `next dev` cannot load the SWC binary next-intl needs (CLAUDE.md, Landing), so it
// runs in the Linux container instead (`cf:docker --dev-app`, same port).
import { spawn } from 'node:child_process';

const env = {
  ...process.env,
  NEXT_PUBLIC_LEARNER_APP: process.env.NEXT_PUBLIC_LEARNER_APP ?? 'on',
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
};
const [command, args] =
  process.platform === 'win32'
    ? ['node', ['scripts/cf-docker.mjs', '--dev-app']]
    : ['pnpm', ['exec', 'next', 'dev', '--port', '3001', ...process.argv.slice(2)]];
const child = spawn(command, args, { env, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 1));
