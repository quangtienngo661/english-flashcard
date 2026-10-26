// Smoke test for Bước 2 (Content + Pipeline) against a REAL running API + worker
// (not createTestApp()). Start them first: `pnpm docker:up` (repo root), then
// `pnpm build && pnpm run:dev` (this package). Then: `pnpm smoke:buoc-2`.
//
// Exercises the full HTTP surface end to end with a small, fast, self-contained CSV
// (not the real CEFR-J file -- that scale/crash-recovery proof already lives in
// test/pipeline/real-files.e2e-spec.ts and is demonstrated by hand in
// docs/deliveries/buoc-2-test-flow.md). Safe to re-run: every email/lemma is
// randomized per run, so it never collides with a previous run's data.
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.SMOKE_MAILPIT_URL ?? 'http://localhost:8025';
const run = randomUUID().slice(0, 8);

let stepNo = 0;
function step(name) { stepNo += 1; console.log(`\n[${stepNo}] ${name}`); }
function ok(detail) { console.log(`    ok — ${detail}`); }

async function expect(res, status, context) {
  if (res.status !== status) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`${context}: expected ${status}, got ${res.status}\n${body}`);
  }
  return res;
}

async function waitForApi(timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(`${BASE}/v1/sources`);
      if (res.ok) return;
    } catch { /* API not up yet */ }
    if (Date.now() > deadline) throw new Error(`API not reachable at ${BASE} after ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function otpCodeFor(email) {
  const deadline = Date.now() + 10_000;
  for (;;) {
    const list = await (await fetch(`${MAILPIT}/api/v1/messages`)).json();
    const message = list.messages?.find((m) => m.To?.[0]?.Address === email);
    if (message) {
      const full = await (await fetch(`${MAILPIT}/api/v1/message/${message.ID}`)).json();
      const match = (full.Text ?? '').match(/(\d{6})/);
      if (match) return match[1];
    }
    if (Date.now() > deadline) throw new Error(`No OTP mail found for ${email} after 10s`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

async function registerAdmin() {
  const email = `smoke-admin-${run}@example.com`;
  const password = 'Smoke-Test-Pass-9!';
  const registered = await expect(
    await fetch(`${BASE}/v1/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, timezone: 'Asia/Ho_Chi_Minh', given_name: 'Smoke', birth_date: '2000-01-01', accept_terms: true, client: 'web' }),
    }), 201, 'register admin',
  ).then((r) => r.json());
  await expect(
    await fetch(`${BASE}/v1/auth/otp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${registered.access_token}` },
      body: JSON.stringify({ purpose: 'verify_email' }),
    }), 202, 'request verify-email OTP',
  );
  const code = await otpCodeFor(email);
  await expect(
    await fetch(`${BASE}/v1/auth/verify-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${registered.access_token}` },
      body: JSON.stringify({ code }),
    }), 200, 'verify admin email',
  );
  if (!existsSync('dist/cli/admin-grant.js')) throw new Error('Missing dist/cli/admin-grant.js; run `pnpm build` first.');
  execFileSync(process.execPath, ['dist/cli/admin-grant.js', email], { stdio: 'pipe' });
  const login = await expect(
    await fetch(`${BASE}/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, client: 'web' }),
    }), 200, 'login as admin',
  ).then((r) => r.json());
  ok(`admin ${email} registered, verified, granted, logged in`);
  return login.access_token;
}

async function registerLearner() {
  const email = `smoke-learner-${run}@example.com`;
  const registered = await expect(
    await fetch(`${BASE}/v1/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Smoke-Test-Pass-9!', timezone: 'Asia/Ho_Chi_Minh', given_name: 'Smoke', birth_date: '2000-01-01', accept_terms: true, client: 'web' }),
    }), 201, 'register learner',
  ).then((r) => r.json());
  await expect(
    await fetch(`${BASE}/v1/me`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${registered.access_token}` },
      body: JSON.stringify({ native_language: 'vi' }),
    }), 200, 'set learner native_language',
  );
  ok(`learner ${email} registered with native_language=vi`);
  return registered.access_token;
}

async function registerSource(token) {
  const source = await expect(
    await fetch(`${BASE}/v1/admin/content/sources`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: `Smoke-${run}`, version: '1.0', license: 'test license', display_priority: 90 }),
    }), 201, 'register test source',
  ).then((r) => r.json());
  ok(`source ${source.id} registered`);
  return source.id;
}

async function upload(token, sourceId, csvText, fileName) {
  const form = new FormData();
  form.set('level_source_id', sourceId);
  form.set('file', new Blob([csvText], { type: 'text/csv' }), fileName);
  const accepted = await expect(
    await fetch(`${BASE}/v1/admin/content/uploads`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': randomUUID() }, body: form,
    }), 202, `upload ${fileName}`,
  ).then((r) => r.json());
  const deadline = Date.now() + 15_000;
  for (;;) {
    const report = await expect(
      await fetch(`${BASE}/v1/admin/content/uploads/${accepted.batch_id}`, { headers: { Authorization: `Bearer ${token}` } }),
      200, 'read batch report',
    ).then((r) => r.json());
    if (report.status !== 'queued' && report.status !== 'running') return report;
    if (Date.now() > deadline) throw new Error(`Batch ${accepted.batch_id} did not finish within 15s`);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

async function main() {
  const started = Date.now();
  step('Wait for the API');
  await waitForApi();
  ok(`reachable at ${BASE}`);

  step('Register admin (register → verify via Mailpit OTP → admin:grant → login)');
  const adminToken = await registerAdmin();

  step('Register a test data source');
  const sourceId = await registerSource(adminToken);

  step('Upload a small CSV with one deliberately invalid row');
  const lemma = `smoke-${run}`;
  // CEFR is set for -ok right away (it needs a level to be publishable later); -gap's level
  // is added in the "fill the gaps" step below, matching the real manual walkthrough.
  const headers = 'headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics';
  const firstUpload = await upload(adminToken, sourceId, [
    headers,
    `${lemma}-ok,noun,A1,quả táo,A round fruit.,I ate it.,food`,
    `${lemma}-gap,noun,,,,,business`,
    `${lemma}-bad,xyz,,từ sai,A bad row.,This row is invalid.,business`,
  ].join('\r\n'), 'smoke.csv');
  if (firstUpload.counters.rejected !== 1 || firstUpload.counters.created !== 2) {
    throw new Error(`Unexpected counters: ${JSON.stringify(firstUpload.counters)}`);
  }
  ok(`batch ${firstUpload.id}: 2 created, 1 rejected, as expected`);

  step('Download rejected.csv, fix the bad row, re-upload');
  const rejectedCsv = await expect(
    await fetch(`${BASE}/v1/admin/content/uploads/${firstUpload.id}/rejected.csv`, { headers: { Authorization: `Bearer ${adminToken}` } }),
    200, 'download rejected.csv',
  ).then((r) => r.text());
  if (!rejectedCsv.includes(`${lemma}-bad`) || !rejectedCsv.includes('xyz')) {
    throw new Error(`rejected.csv did not contain the expected bad row:\n${rejectedCsv}`);
  }
  const fixed = rejectedCsv.replace(`${lemma}-bad,xyz,`, `${lemma}-bad,noun,`);
  const fixedUpload = await upload(adminToken, sourceId, fixed, 'smoke-fixed.csv');
  if (fixedUpload.counters.created !== 1 || fixedUpload.counters.rejected !== 0) {
    throw new Error(`Fixed re-upload did not succeed cleanly: ${JSON.stringify(fixedUpload.counters)}`);
  }
  ok('fixed row created successfully on re-upload; _row/_error columns were ignored');

  step('Export the unpublishable list, fill the gaps, re-upload');
  const unpublishableBefore = await expect(
    await fetch(`${BASE}/v1/admin/content/senses/export?status=unpublishable`, { headers: { Authorization: `Bearer ${adminToken}` } }),
    200, 'export unpublishable list',
  ).then((r) => r.text());
  const exportLines = unpublishableBefore.split('\r\n');
  const gapRow = exportLines.find((line) => line.startsWith(`${lemma}-gap,`));
  if (!gapRow) throw new Error(`Expected ${lemma}-gap in the unpublishable export:\n${unpublishableBefore}`);
  // Read by header name: the export gains columns over time (form_of, inflections in 6652985).
  const exportHeader = exportLines[0].replace(/^﻿/, '').split(',');
  const gapCells = gapRow.split(',');
  const senseId = gapCells[exportHeader.indexOf('sense_id')];
  const revision = gapCells[exportHeader.indexOf('revision')];
  const fillUpload = await upload(adminToken, sourceId, [
    'headword,pos,CEFR,gloss_vi,definition_en,example_en_1,topics,sense_id,revision',
    `${lemma}-gap,noun,A1,lòng can đảm,Bravery.,She showed it.,business,${senseId},${revision}`,
  ].join('\r\n'), 'smoke-fill.csv');
  if (fillUpload.status !== 'succeeded') throw new Error(`Fill upload did not succeed: ${JSON.stringify(fillUpload)}`);
  const unpublishableAfter = await expect(
    await fetch(`${BASE}/v1/admin/content/senses/export?status=unpublishable`, { headers: { Authorization: `Bearer ${adminToken}` } }),
    200, 're-export unpublishable list',
  ).then((r) => r.text());
  if (unpublishableAfter.includes(`${lemma}-gap,`)) throw new Error(`${lemma}-gap is still unpublishable after filling it`);
  ok(`${lemma}-gap filled and no longer unpublishable`);

  step('Publish one sense by explicit list, another by publish-job filter');
  const currentRevision = (await (await fetch(`${BASE}/v1/admin/content/senses?sense_id=${senseId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })).json()).items[0]?.revision;
  if (!currentRevision) throw new Error(`Could not read ${lemma}-gap's current revision before publishing`);
  await expect(
    await fetch(`${BASE}/v1/admin/content/senses/publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ items: [{ sense_id: senseId, revision: currentRevision }] }),
    }), 200, 'publish by explicit list',
  );
  // Scoped to this run's own first batch (via batch_id, Task 22's BATCH_SCOPE), not a broad
  // pos/topic filter -- the shared dev database has unrelated senses that would also match.
  const job = await expect(
    await fetch(`${BASE}/v1/admin/content/senses/publish-jobs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`, 'Idempotency-Key': randomUUID() },
      body: JSON.stringify({ filter: { batch_id: firstUpload.id } }),
    }), 202, 'create publish-job',
  ).then((r) => r.json());
  const jobDeadline = Date.now() + 10_000;
  let jobStatus;
  for (;;) {
    jobStatus = await expect(
      await fetch(`${BASE}/v1/admin/content/senses/publish-jobs/${job.job_id}`, { headers: { Authorization: `Bearer ${adminToken}` } }),
      200, 'read publish-job status',
    ).then((r) => r.json());
    if (jobStatus.status !== 'queued' && jobStatus.status !== 'running') break;
    if (Date.now() > jobDeadline) throw new Error('Publish job did not finish within 10s');
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  ok(`published by list (gap sense) and by job ${job.job_id} (status: ${jobStatus.status})`);

  step('Search as a learner with native_language set');
  const learnerToken = await registerLearner();
  const results = await expect(
    await fetch(`${BASE}/v1/senses/search?q=${lemma}`, { headers: { Authorization: `Bearer ${learnerToken}` } }),
    200, 'learner search',
  ).then((r) => r.json());
  const found = results.items.find((item) => item.lemma === `${lemma}-gap`);
  if (!found || found.meaning?.text !== 'lòng can đảm') {
    throw new Error(`Learner search did not return the expected Vietnamese meaning: ${JSON.stringify(results.items)}`);
  }
  ok(`learner sees "${found.lemma}" with meaning "${found.meaning.text}"`);

  console.log(`\nALL CHECKS PASSED in ${Date.now() - started}ms (run id ${run})`);
}

main().catch((error) => {
  console.error('\nSMOKE TEST FAILED:', error.message);
  process.exitCode = 1;
});
