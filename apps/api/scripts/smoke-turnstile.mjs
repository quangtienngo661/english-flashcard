// Shared by the smokes and learner-test-setup (launch prep A, design 4.2): register, login and OTP requests now need a
// `turnstile_token`. The API under test must run with TURNSTILE_MODE=fake, where any well-formed token passes.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

export const SMOKE_TURNSTILE_TOKEN = 'smoke-token';

/**
 * Stops a script early when its environment (a variable in the shell wins over `apps/api/.env`) does not say TURNSTILE_MODE=fake,
 * so a missing token fails with a clear sentence instead of a 400 or a hang halfway through. It cannot see the running API's own
 * value: start the API and the script with the same one.
 */
export function requireFakeTurnstile() {
  const fileEnv = !process.env.SMOKE_IGNORE_ENV_FILE && existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
  const value = process.env.TURNSTILE_MODE ?? fileEnv.TURNSTILE_MODE;
  if (value !== 'fake') {
    throw new Error(`TURNSTILE_MODE is ${value ?? 'not set'}: set TURNSTILE_MODE=fake in apps/api/.env for this smoke (or export it in this shell), and start the API with the same value.`);
  }
}
