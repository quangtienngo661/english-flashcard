// Review probes (independent review 18/10/2026) — not part of the product suite; lives only in the review worktree.
import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContentService } from '../../src/content/index.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { testConfig } from '../support/test-config.js';

const out = (...a: unknown[]) => appendFileSync(process.env.PROBE_OUT ?? 'probe.out', a.join(' ') + '\n');
const gc = (globalThis as { gc?: () => void }).gc;
const rssMb = async () => {
  for (let i = 0; i < 3; i += 1) { gc?.(); await new Promise((r) => setTimeout(r, 50)); }
  return Math.round(process.memoryUsage().rss / 1_048_576);
};

/** The i-th upper/lower-case spelling of `zone` (bit k of i flips letter k). */
function spelling(zone: string, i: number): string {
  let bit = 0;
  return [...zone].map((ch) => {
    if (!/[a-z]/i.test(ch)) return ch;
    const flip = ((i >> bit) & 1) === 1;
    bit += 1;
    return flip ? (ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase()) : ch;
  }).join('');
}

describe('review probes: ID1 timezone spellings', () => {
  let ctx: TestApp;
  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 1_000_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config });
  });
  afterAll(async () => { await ctx?.close(); });

  it('ID1: accepted spellings, and RSS after N distinct spellings vs N repeats of one', async () => {
    out('ID1 gc available:', typeof gc);
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const token = (await startSession(ctx, userId)).accessToken;
    const auth = { Authorization: `Bearer ${token}` };
    const round = async (timezone: string) => {
      const p = await ctx.http().patch('/v1/me').set(auth).send({ timezone });
      const g = await ctx.http().get('/v1/groups').set(auth);
      return [p.status, g.status];
    };

    for (const tz of ['asia/ho_chi_minh', 'ASIA/HO_CHI_MINH', '+07:00', '-23:59', 'Mars/Base']) {
      const p = await ctx.http().patch('/v1/me').set(auth).send({ timezone: tz });
      const stored = (await ctx.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { timezone: true } })).timezone;
      out('ID1 PATCH timezone', JSON.stringify(tz), '->', p.status, 'stored', JSON.stringify(stored));
    }

    // Count the formatters local-date.ts builds: it calls `new Intl.DateTimeFormat('en-CA', …)` only on a cache miss.
    const Original = Intl.DateTimeFormat;
    let enCa = 0;
    class Counting extends Original {
      constructor(locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
        super(locales, options);
        if (locales === 'en-CA') enCa += 1;
      }
    }
    (Intl as { DateTimeFormat: unknown }).DateTimeFormat = Counting;
    const N = 1200;
    const zone = 'America/Argentina/ComodRivadavia';
    const phase = async (label: string, zones: (i: number) => string) => {
      const before = enCa;
      const r = await rssMb();
      const statuses = new Set<string>();
      for (let i = 1; i <= N; i += 1) statuses.add(String(await round(zones(i))));
      const after = await rssMb();
      out(`ID1 ${label}: new en-CA formatters ${enCa - before}; RSS ${r} -> ${after} MB (+${after - r}); statuses ${[...statuses].join(' ')}`);
    };
    try {
      await phase(`warm-up, ${N} rounds of one zone`, () => 'Asia/Ho_Chi_Minh');
      await phase(`control A, ${N} rounds of one zone`, () => 'Asia/Ho_Chi_Minh');
      await phase(`${N} distinct spellings`, (i) => spelling(zone, i));
      await phase(`control B, ${N} rounds of one zone`, () => 'Asia/Ho_Chi_Minh');
      await phase(`the same ${N} spellings again`, (i) => spelling(zone, i));
    } finally {
      (Intl as { DateTimeFormat: unknown }).DateTimeFormat = Original;
    }
    expect(true).toBe(true);
  }, 900_000);
});

describe('review probes: CT1 rejected revisions', () => {
  let ctx: TestApp;
  let content: ContentService;
  let editorId: string;
  let token: string;
  const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config });
    content = ctx.app.get(ContentService);
    ctx.clock.set(new Date('2026-10-18T12:00:00Z'));
    editorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    token = (await startSession(ctx, editorId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });

  const write = <T>(lemma: string, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, 'noun');
      return action(tx);
    }, transactionOptions);
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const save = (id: string, revision: number, patch: object) => ctx.http().put(`/v1/admin/content/senses/${id}/draft`)
    .set(auth()).send({ revision, content: patch });
  const review = (items: object[]) => ctx.http().post('/v1/admin/content/senses/review').set(auth()).send({ items });
  const publish = (items: object[]) => ctx.http().post('/v1/admin/content/senses/publish').set(auth()).send({ items });
  const revisions = (senseId: string) => ctx.prisma.senseRevision.findMany({ where: { senseId }, orderBy: { revisionNo: 'asc' },
    select: { id: true, revisionNo: true, status: true, examples: true } });

  /** A sense of `lemma` whose revision 1 is published with one good example. */
  const published = async (lemma: string) => {
    const entry = (await write(lemma, (tx) => content.ensureEntry(tx, { lemma, pos: 'noun', variants: [] }))).entry;
    const first = await write(lemma, (tx) => content.createSense(tx, {
      entryId: entry.id, contextLabel: null, source: 'ui', actorId: editorId,
      content: { glossVi: 'thăm dò', definitionEn: 'A probe.', examplesEn: [`A good ${lemma}.`], topicCodes: [], acceptedForms: [] },
    }));
    await write(lemma, async (tx) => {
      await content.setEditorialLevel(tx, entry.id, 'A1');
      await tx.senseRevision.update({ where: { id: first.revisionId }, data: { status: 'published', publishedAt: ctx.clock.now() } });
      await tx.sense.update({ where: { id: first.senseId }, data: { liveRevisionId: first.revisionId } });
    });
    return first.senseId;
  };

  it('CT1a: a rejected revision 2 is published by POST /senses/publish', async () => {
    const senseId = await published('probea');
    const s = await save(senseId, 1, { examples_en: ['A BAD example.'] });
    out('CT1a save rev2', s.status, JSON.stringify(s.body).slice(0, 160));
    const r = await review([{ sense_id: senseId, revision: 2, action: 'rejected' }]);
    out('CT1a reject rev2', r.status, JSON.stringify(r.body));
    const p = await publish([{ sense_id: senseId, revision: 2 }]);
    out('CT1a publish rev2', p.status, JSON.stringify(p.body));
    const sense = await ctx.prisma.sense.findUniqueOrThrow({ where: { id: senseId } });
    const revs = await revisions(senseId);
    out('CT1a revisions', JSON.stringify(revs.map((v) => ({ no: v.revisionNo, status: v.status, live: v.id === sense.liveRevisionId,
      examples: v.examples }))));
  });

  it('CT1b: quick-publish with no change publishes the rejected revision', async () => {
    const senseId = await published('probeb');
    await save(senseId, 1, { examples_en: ['A BAD example.'] });
    const r = await review([{ sense_id: senseId, revision: 2, action: 'rejected' }]);
    out('CT1b reject rev2', r.status, JSON.stringify(r.body));
    const q = await ctx.http().post(`/v1/admin/content/senses/${senseId}/quick-publish`).set(auth()).send({ revision: 2, content: {} });
    out('CT1b quick-publish', q.status, JSON.stringify(q.body));
    const sense = await ctx.prisma.sense.findUniqueOrThrow({ where: { id: senseId } });
    const revs = await revisions(senseId);
    out('CT1b revisions', JSON.stringify(revs.map((v) => ({ no: v.revisionNo, status: v.status, live: v.id === sense.liveRevisionId,
      examples: v.examples }))));
  });

  it('CT1c: the next draft after a rejection is merged on top of the rejected content', async () => {
    const senseId = await published('probec');
    await save(senseId, 1, { examples_en: ['A BAD example.'] });
    await review([{ sense_id: senseId, revision: 2, action: 'rejected' }]);
    const s = await save(senseId, 2, { definition_en: 'A new definition.' });
    out('CT1c save on top of rev2', s.status);
    const revs = await revisions(senseId);
    out('CT1c revisions', JSON.stringify(revs.map((v) => ({ no: v.revisionNo, status: v.status, examples: v.examples }))));
  });

  it('control: a draft revision 2 that is NOT rejected publishes (same path, expected)', async () => {
    const senseId = await published('probed');
    await save(senseId, 1, { examples_en: ['Another good example.'] });
    const p = await publish([{ sense_id: senseId, revision: 2 }]);
    out('CT1 control publish rev2 (draft)', p.status, JSON.stringify(p.body));
    expect(randomUUID()).toBeTypeOf('string');
  });
});
