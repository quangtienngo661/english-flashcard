// Round 1 of the real Google check (Bước 8, D32), before the learner web has its Google button.
// It makes sure ONE verified learner account exists for your own Gmail address, so that signing in with that Gmail takes the
// "existing verified account" path of the callback (design §5.4): Wordmet links the Google identity, opens a Google session and sets the
// `refresh_token` cookie, which is the thing round 1 has to prove. Without this account the callback ends at the sign-up page instead.
//
//   DATABASE_URL=postgresql://dev:dev@localhost:5434/<database> node scripts/google-round1-account.mjs you@gmail.com
//
// Test data only: the account has no password and no learning data. Safe to run again.
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import pg from 'pg';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) {
  console.error('Usage: node scripts/google-round1-account.mjs <your-gmail-address>');
  process.exit(1);
}
if (existsSync('.env')) process.loadEnvFile('.env');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  const existing = await client.query('SELECT id, email_verified_at, status FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) {
    const row = existing.rows[0];
    console.log(`account exists: verified=${row.email_verified_at !== null}, status=${row.status}`);
    if (row.email_verified_at === null) await client.query('UPDATE users SET email_verified_at = now() WHERE id = $1', [row.id]);
  } else {
    await client.query(
      `INSERT INTO users (id, email, email_verified_at, timezone, given_name, birth_date, terms_accepted_at, terms_version, status, updated_at)
       VALUES ($1, $2, now(), 'Asia/Ho_Chi_Minh', 'Round1', '1990-01-01', now(), 'round1', 'active', now())`,
      [randomUUID(), email]);
    console.log('account created (verified, no password)');
  }
} finally {
  await client.end();
}
