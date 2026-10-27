import { randomUUID } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createAccount, grantAdmin, loginToken, registerVerified, waitForHealth } from './support/api';

export const STATE_FILE = path.join(import.meta.dirname, '.state.json');

export type RealState = {
  run: string;
  admin: { email: string; password: string };
  learner: { email: string; password: string };
  /** Made by the admin through the API (no registration): Minh is an editor, Lan and Khoa are learners with a native language. */
  editor: { id: string; email: string; password: string };
  lan: { id: string; email: string; password: string };
  khoa: { id: string; email: string; password: string };
};

/**
 * Waits for the API, then creates the two base accounts of this run (spec §10: registrations per run = 2) and, through
 * the admin API, Minh (editor), Lan and Khoa (learners) for the screens that need more people. Emails are run-unique, so a database with earlier data is fine.
 */
export default async function globalSetup(): Promise<void> {
  await waitForHealth();
  // Dev aid: `auth.register.ip` allows 5 registrations an hour per IP, so while iterating on the spec the two
  // accounts of an earlier run can be reused. CI never sets this, and a real run always registers both.
  if (process.env.E2E_REUSE_STATE && existsSync(STATE_FILE)) return;
  const run = randomUUID().slice(0, 8);
  const password = 'Real-Stack-Pass-9!';
  const base = {
    run,
    admin: { email: `e2e-admin-${run}@example.com`, password },
    learner: { email: `e2e-learner-${run}@example.com`, password },
  };
  await registerVerified(base.admin.email, base.admin.password);
  grantAdmin(base.admin.email);
  await registerVerified(base.learner.email, base.learner.password);
  const adminToken = await loginToken(base.admin.email, base.admin.password);
  const made = async (name: string, role: 'editor' | null) => {
    const email = `e2e-${name}-${run}@example.com`;
    return { email, ...(await createAccount(adminToken, email, role)) };
  };
  const state: RealState = { ...base, editor: await made('minh', 'editor'), lan: await made('lan', null), khoa: await made('khoa', null) };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
