// One entry point for the Docker stack, run from the repo root (no need to enter each app):
//   pnpm bootstrap                      create .env if missing, build the images, start everything, wait until healthy
//   pnpm bootstrap seed [--admin <email>] [--learner <email>]
//                                       sample content, one admin and one Pro learner (local test accounts)
//   pnpm bootstrap infra                only Postgres, Redis and Mailpit (run the apps on the host instead)
//   pnpm bootstrap status | logs [service] | down [--volumes]
// Settings live in the root .env (git-ignored); ENV_FILE=<path> uses another file. Needs Docker with Compose v2.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const examplePath = resolve(root, '.env.example');
// Which settings file: ENV_FILE if set, else the root .env, else the apps/api/.env you already use when running the API on
// the host (its host-only values, like DATABASE_URL=localhost, are overridden in docker-compose.yml). None yet: root .env is created.
const envFile = process.env.ENV_FILE
  ? resolve(root, process.env.ENV_FILE)
  : [resolve(root, '.env'), resolve(root, 'apps/api/.env')].find(existsSync) ?? resolve(root, '.env');
const SEED_DEFAULTS = { admin: 'admin.local@example.com', learner: 'lan.local@example.com' };

function run(args, { allowFail = false, capture = false } = {}) {
  const result = spawnSync('docker', args, {
    cwd: root,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
    env: { ...process.env, ENV_FILE: envFile },
  });
  if (result.error) fail(`Cannot run docker: ${result.error.message}. Is Docker installed and on PATH?`);
  if (!allowFail && result.status !== 0) process.exit(result.status ?? 1);
  return result;
}

function fail(message) {
  console.error(`\n${message}`);
  process.exit(1);
}

const compose = (...args) => ['compose', '--env-file', envFile, ...args];
const composeApp = (...args) => compose('--profile', 'app', ...args);

function ensureDocker() {
  const info = run(['info', '--format', '{{.ServerVersion}}'], { allowFail: true, capture: true });
  if (info.status !== 0) fail('Docker is not running. Start Docker Desktop, wait until it says "running", then try again.');
  const version = run(['compose', 'version', '--short'], { allowFail: true, capture: true });
  if (version.status !== 0) fail('Docker Compose v2 is missing (`docker compose version` failed).');
}

// Copies .env.example to the env file and gives every REPLACE_WITH_GENERATED_* its own random value, the same as
// `node apps/api/scripts/gen-secret.mjs` (32 random bytes, base64url). An existing file is never touched.
function ensureEnvFile() {
  if (existsSync(envFile)) {
    const missing = readFileSync(envFile, 'utf8').match(/REPLACE_WITH_GENERATED_[A-Z_]+/g);
    if (missing) fail(`${envFile} still has placeholders (${[...new Set(missing)].join(', ')}). Replace them, or delete the file so it is generated again.`);
    return;
  }
  copyFileSync(examplePath, envFile);
  const text = readFileSync(envFile, 'utf8').replace(/REPLACE_WITH_GENERATED_[A-Z_]+/g, () => randomBytes(32).toString('base64url'));
  writeFileSync(envFile, text);
  console.log(`Created ${envFile} with fresh secrets.`);
  console.log('To use the AI providers, put OPENAI_API_KEY / ANTHROPIC_API_KEY in it (optional; without them only the fake model exists).\n');
}

function readPorts() {
  // The same order compose uses: the shell environment first, then the env file, then the default.
  const text = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
  const port = (key, fallback) => process.env[key] ?? text.match(new RegExp(`^${key}=(\\d+)`, 'm'))?.[1] ?? fallback;
  return { api: port('API_PORT', '3000'), admin: port('ADMIN_PORT', '5173'), web: port('WEB_PORT', '3001'), mailpit: port('MAILPIT_UI_PORT', '8025') };
}

function printUrls() {
  const p = readPorts();
  console.log(`
Ready:
  Admin        http://localhost:${p.admin}
  Learner web  http://localhost:${p.web}/vi/app
  API          http://localhost:${p.api}/v1/health
  Mailpit      http://localhost:${p.mailpit}   (every email the app sends, e.g. the 6-digit sign-up code)
First time? Run \`pnpm bootstrap seed\` for sample content and test accounts.`);
}

function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

const [command = 'up', ...rest] = process.argv.slice(2);

switch (command) {
  case 'up': {
    ensureDocker();
    ensureEnvFile();
    console.log(`Settings from ${envFile}`);
    // --wait returns once every service is healthy. The first start migrates and compiles the API, so allow 10 minutes.
    run(composeApp('up', '-d', '--build', '--wait', '--wait-timeout', '600'));
    printUrls();
    break;
  }
  case 'infra': {
    ensureDocker();
    run(compose('up', '-d', '--wait', 'postgres', 'redis', 'mailpit'));
    break;
  }
  case 'seed': {
    ensureDocker();
    const admin = flag(rest, '--admin') ?? SEED_DEFAULTS.admin;
    const learner = flag(rest, '--learner') ?? SEED_DEFAULTS.learner;
    // Runs inside the api container: it has the built dist/, the secrets and the network names the script needs.
    run(composeApp('exec', '-T', '-e', 'API_BASE_URL=http://127.0.0.1:3000', '-e', 'MAILPIT_URL=http://mailpit:8025',
      'api', 'node', 'scripts/learner-test-setup.mjs', '--admin', admin, '--learner', learner, '--plan', 'pro'));
    break;
  }
  case 'status':
    ensureDocker();
    run(composeApp('ps'));
    break;
  case 'logs':
    ensureDocker();
    run(composeApp('logs', '-f', '--tail', '100', ...rest));
    break;
  case 'down':
    ensureDocker();
    run(composeApp('down', ...(rest.includes('--volumes') ? ['--volumes'] : [])));
    break;
  default:
    fail(`Unknown command "${command}". Use: up (default), seed, infra, status, logs, down.`);
}
