import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { InflectionsBackfillHandler } from '../../src/content-pipeline/inflections/inflections-backfill.handler.js';
import { BackgroundJobsService, makeJobContext } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import type { JobContext } from '../../src/content-pipeline/jobs/job-types.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const cefrFile = new URL('../../../../docs/preparation/evidence/wordlists_2026-10-02/cefrj-vocabulary-profile-1.5.csv', import.meta.url);
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;

describe('inflection backfill job (e2e, isolated database)', () => {
  let ctx: TestApp;
  let actorId: string;
  let token: string;

  /** The CEFR-J entries as they stand before 4b: catalog rows without any inflection. */
  const seedCefrEntries = async () => {
    const rows = readFileSync(cefrFile, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((line) => {
      const [head = '', pos = ''] = line.split(',');
      return { lemma: head.split('/')[0].trim(), pos };
    });
    const unique = [...new Map(rows.map((row) => [`${row.lemma}\0${row.pos}`, row])).values()];
    await ctx.prisma.$executeRaw`
      INSERT INTO entries (language, lemma, pos)
      SELECT 'en', l, p FROM unnest(${unique.map(({ lemma }) => lemma)}::text[], ${unique.map(({ pos }) => pos)}::text[]) AS t(l, p)
      ON CONFLICT (language, lemma, pos) WHERE scope = 'catalog' DO NOTHING`;
    return unique;
  };
  const createJob = () => ctx.prisma.$transaction((tx) => ctx.app.get(BackgroundJobsService).create(tx, {
    queue: 'content-inflections', createdBy: actorId, operationId: randomUUID(), exclusiveKey: 'content-inflections' }));
  const run = async (wrap: (job: JobContext) => JobContext = (job) => job) => {
    const jobs = ctx.app.get(BackgroundJobsService);
    const id = await createJob();
    const lease = await jobs.acquire(id, randomUUID());
    const job = makeJobContext(ctx.prisma, id, lease!.attempts, lease!.epoch);
    try {
      const status = await ctx.app.get(InflectionsBackfillHandler).run(wrap(job));
      expect(await jobs.finish(id, job.epoch, status)).toBe(true);
      return status;
    } catch (error) {
      await jobs.finish(id, job.epoch, 'failed');
      throw error;
    }
  };
  const snapshot = () => ctx.prisma.entryInflection.findMany({ orderBy: [{ entryId: 'asc' }, { kind: 'asc' }, { position: 'asc' }],
    select: { entryId: true, form: true, kind: true, source: true, position: true } });

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config, pipeline: { runWorkers: false } });
  });
  beforeEach(async () => {
    await ctx.prisma.backgroundJob.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.user.deleteMany();
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'admin' })).userId;
    token = (await startSession(ctx, actorId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });

  it('backfill over the real CEFR-J entries creates forms for verbs and nouns (not adjectives), and a re-run creates nothing', async () => {
    await seedCefrEntries();
    const reviewed = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'go', pos: 'verb' } });
    await ctx.prisma.entryInflection.create({ data: { entryId: reviewed.id, form: 'went', formKey: 'went', kind: 'past', source: 'reviewed' } });
    const privateRow = (await ctx.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO entries (language, lemma, pos, scope, owner_user_id) VALUES ('en', 'yeet', 'verb', 'private', ${randomUUID()}::uuid) RETURNING id`)[0];
    expect(await run()).toBe('succeeded');
    const byPos = await ctx.prisma.$queryRaw<Array<{ pos: string; entries: number; forms: number }>>`
      SELECT e.pos, COUNT(DISTINCT e.id)::int AS entries, COUNT(*)::int AS forms
      FROM entry_inflections i JOIN entries e ON e.id = i.entry_id WHERE i.source = 'library' GROUP BY e.pos ORDER BY e.pos`;
    console.log('B3 backfill over CEFR-J', JSON.stringify(byPos));
    expect(byPos.map(({ pos }) => pos)).toEqual(['noun', 'verb']);
    expect(byPos.find(({ pos }) => pos === 'verb')!.entries).toBeGreaterThan(1_200);
    expect(byPos.find(({ pos }) => pos === 'noun')!.entries).toBeGreaterThan(3_800);
    const leave = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'leave', pos: 'verb' }, include: { inflections: { orderBy: { position: 'asc' } } } });
    expect(leave.inflections.map(({ form, kind }) => `${kind}:${form}`)).toEqual(
      // AGID lists leaved (of leaves on a tree) at level 0 beside left; D46 keeps every level-0 form in AGID order.
      ['third_person:leaves', 'present_participle:leaving', 'past:left', 'past:leaved', 'past_participle:left', 'past_participle:leaved']);
    // Reviewed rows win; private entries are not the backfill's business.
    expect(await ctx.prisma.entryInflection.findMany({ where: { entryId: reviewed.id }, select: { form: true, source: true } }))
      .toEqual([{ form: 'went', source: 'reviewed' }]);
    expect(await ctx.prisma.entryInflection.count({ where: { entryId: privateRow.id } })).toBe(0);
    const before = await snapshot();
    expect(await run()).toBe('succeeded');
    expect(await snapshot()).toEqual(before);
  }, 300_000);

  it('a crash after one chunk resumes without duplicates', async () => {
    await seedCefrEntries();
    let calls = 0;
    // The second transaction (chunk) dies after the first one committed.
    const crashing = (job: JobContext): JobContext => ({ ...job, tx: async (fn) => {
      calls += 1;
      if (calls === 2) throw new Error('simulated crash');
      return job.tx(fn);
    } });
    await expect(run(crashing)).rejects.toThrow('simulated crash');
    const partial = await ctx.prisma.entryInflection.count();
    expect(partial).toBeGreaterThan(0);
    expect(await run()).toBe('succeeded');
    const resumed = await snapshot();
    await ctx.prisma.entryInflection.deleteMany();
    expect(await run()).toBe('succeeded');
    expect(await snapshot()).toEqual(resumed);
    expect(resumed.length).toBeGreaterThan(partial);
  }, 300_000);

  it('POST /v1/admin/content/inflections/backfill → 202 { job_id }, needs Idempotency-Key and content.import; GET shows its status', async () => {
    const post = (headers: Record<string, string>, bearer = token) => ctx.http().post('/v1/admin/content/inflections/backfill')
      .set('Authorization', `Bearer ${bearer}`).set(headers).send({});
    const accepted = await post({ 'Idempotency-Key': randomUUID() });
    expect(accepted.status).toBe(202);
    expect(accepted.body).toEqual({ job_id: expect.any(String) });
    expect(await ctx.prisma.backgroundJob.findUniqueOrThrow({ where: { id: accepted.body.job_id } }))
      .toMatchObject({ queue: 'content-inflections', status: 'queued', exclusiveKey: 'content-inflections', createdBy: actorId });
    const status = await ctx.http().get(`/v1/admin/content/inflections/backfill/${accepted.body.job_id}`).set('Authorization', `Bearer ${token}`);
    expect(status.status).toBe(200);
    expect(status.body).toMatchObject({ id: accepted.body.job_id, status: 'queued', started_at: null, finished_at: null });
    expect((await ctx.http().get(`/v1/admin/content/inflections/backfill/${randomUUID()}`).set('Authorization', `Bearer ${token}`)).status).toBe(404);
    const noKey = await post({});
    expect(noKey.status).toBe(400);
    const learner = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    const forbidden = await post({ 'Idempotency-Key': randomUUID() }, (await startSession(ctx, learner)).accessToken);
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.type).toBe(problem('forbidden'));
  });
});
