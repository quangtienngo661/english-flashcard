import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, OWNER_SOURCE_ID } from '../../src/content/index.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';

const problem = (slug: string) => `https://api.example.com/problems/${slug}`;

describe('sources and topics (e2e, isolated database)', () => {
  let ctx: TestApp;
  const sources = () => ctx.prisma.dataSource.findMany({ orderBy: { id: 'asc' } });
  const topics = () => ctx.prisma.topic.findMany({
    orderBy: { code: 'asc' }, include: { names: { orderBy: { language: 'asc' } } },
  });
  const catalog = () => Promise.all([
    sources(), topics(),
    ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.entryVariant.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.entryLevel.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.sense.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.senseRevision.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.senseRevisionText.findMany({ orderBy: [{ revisionId: 'asc' }, { language: 'asc' }, { kind: 'asc' }] }),
  ]);
  const staff = async () => {
    const user = await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' });
    return { ...user, ...(await startSession(ctx, user.userId)) };
  };
  const learner = async (nativeLanguage?: 'vi' | 'en') => {
    // Email verification is not required for learner content.
    const user = await seedUser(ctx.prisma, { nativeLanguage });
    return { ...user, ...(await startSession(ctx, user.userId)) };
  };

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  beforeEach(async () => {
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
  });
  afterAll(async () => { await ctx?.close(); });

  it('B2#64: GET /v1/sources without a token returns name, version, url, license and attribution of every source, owner included', async () => {
    const complete = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: 'CEFR-J', version: '1.5', url: 'https://example.com/cefr-j',
      license: 'test license', attribution: 'CEFR-J authors', displayPriority: 10,
    } });
    const incomplete = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: 'Awaiting license', displayPriority: 20,
    } });
    const before = await sources();
    const res = await ctx.http().get('/v1/sources');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
    // The public page carries exactly the licence fields: no id, kind or display_priority.
    expect(res.body.items).toEqual(expect.arrayContaining([
      { name: 'owner', version: '', url: null, license: '', attribution: '' },
      { name: 'CEFR-J', version: '1.5', url: 'https://example.com/cefr-j', license: 'test license', attribution: 'CEFR-J authors' },
      { name: 'Awaiting license', version: '', url: null, license: '', attribution: '' },
    ]));
    const editor = await staff();
    const adminList = await ctx.http().get('/v1/admin/content/sources').set('Authorization', `Bearer ${editor.accessToken}`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.items).toEqual(expect.arrayContaining([
      { id: OWNER_SOURCE_ID, kind: 'owner', name: 'owner', version: '', url: null,
        license: '', attribution: '', display_priority: 0 },
      { id: complete.id, kind: 'third_party', name: 'CEFR-J', version: '1.5', url: 'https://example.com/cefr-j',
        license: 'test license', attribution: 'CEFR-J authors', display_priority: 10 },
      { id: incomplete.id, kind: 'third_party', name: 'Awaiting license', version: '', url: null,
        license: '', attribution: '', display_priority: 20 },
    ]));
    expect(adminList.body.items).toHaveLength(3);
    expect(await sources()).toEqual(before);
  });

  it('source registration: POST stores a third-party source with optional empty version and license, duplicate (name, version) is 409 source-exists, and kind owner cannot be created', async () => {
    const editor = await staff();
    const register = (body: object) => ctx.http().post('/v1/admin/content/sources')
      .set('Authorization', `Bearer ${editor.accessToken}`).send(body);
    const body = { name: 'CEFR-J', version: '', license: '', url: null, attribution: 'test authors', display_priority: 10 };
    const res = await register(body);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), kind: 'third_party', ...body });
    const stored = await ctx.prisma.dataSource.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(stored).toMatchObject({
      kind: 'third_party', name: 'CEFR-J', version: '', license: '', url: null,
      attribution: 'test authors', displayPriority: 10,
    });
    const content = ctx.app.get(ContentService);
    expect(await content.getSource(stored.id)).toEqual(res.body);
    expect(content.isSourceComplete(res.body)).toBe(false);
    const owner = await content.getSource(OWNER_SOURCE_ID);
    expect(owner).not.toBeNull();
    expect(content.isSourceComplete(owner!)).toBe(true);
    expect(await content.getSource(randomUUID())).toBeNull();
    const before = await catalog();
    const duplicate = await register({ ...body, attribution: 'must not overwrite', display_priority: 99 });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.type).toBe(problem('source-exists'));
    expect(duplicate.headers['content-type']).toContain('application/problem+json');
    expect(await catalog()).toEqual(before);
    const ownerAttempt = await register({ ...body, name: 'Another owner', kind: 'owner' });
    expect(ownerAttempt.status).toBe(400);
    expect(ownerAttempt.body.type).toBe(problem('validation-failed'));
    expect(await catalog()).toEqual(before);

    const nextVersion = await register({ ...body, kind: 'third_party', version: '1.5', license: 'test license' });
    expect(nextVersion.status).toBe(201);
    expect(nextVersion.body.id).not.toBe(stored.id);
    const completeSource = await content.getSource(nextVersion.body.id);
    expect(completeSource).toEqual(nextVersion.body);
    expect(content.isSourceComplete(completeSource!)).toBe(true);
    const defaults = await register({ name: 'No metadata yet', display_priority: 20 });
    expect(defaults.status).toBe(201);
    expect(defaults.body).toMatchObject({ kind: 'third_party', version: '', license: '', url: null, attribution: '' });
    expect(await ctx.prisma.dataSource.count({ where: { kind: 'owner' } })).toBe(1);
    expect(await ctx.prisma.dataSource.count({ where: { name: 'CEFR-J' } })).toBe(2);
  });

  it('source registration: invalid fields return 400 validation-failed without changing persisted sources', async () => {
    const editor = await staff();
    const before = await catalog();
    for (const body of [
      {}, { name: '  ' }, { name: 'Invalid URL', url: 'not-a-url' },
      { name: 'Script URL', url: 'javascript:alert(1)' }, { name: 'Data URL', url: 'data:text/html,x' },
      { name: 'FTP URL', url: 'ftp://example.com/list' },
      { name: 'Invalid priority', display_priority: 1.5 },
      { name: 'Overflow', display_priority: 2_147_483_648 },
      { name: 'Unknown field', displayPriority: 10 },
    ]) {
      const res = await ctx.http().post('/v1/admin/content/sources')
        .set('Authorization', `Bearer ${editor.accessToken}`).send(body);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('validation-failed'));
      expect(await catalog()).toEqual(before);
    }
  });

  it('B2#63: a learner without native_language gets 403 profile-incomplete on GET /v1/topics, and no valid token gets 401', async () => {
    const user = await learner();
    const before = await catalog();
    const profileBefore = await ctx.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    expect(profileBefore).toMatchObject({ nativeLanguage: null, emailVerifiedAt: null });
    for (const [token, status, slug] of [
      [user.accessToken, 403, 'profile-incomplete'], [undefined, 401, 'invalid-token'], ['invalid-token', 401, 'invalid-token'],
    ] as const) {
      const req = ctx.http().get('/v1/topics');
      if (token) req.set('Authorization', `Bearer ${token}`);
      const res = await req;
      expect(res.status).toBe(status);
      expect(res.body.type).toBe(problem(slug));
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(await catalog()).toEqual(before);
      expect(await ctx.prisma.user.findUniqueOrThrow({ where: { id: user.userId } })).toEqual(profileBefore);
    }
    expect((await ctx.http().patch('/v1/me').set('Authorization', `Bearer ${user.accessToken}`)
      .send({ native_language: 'vi' })).status).toBe(200);
    const allowed = await ctx.http().get('/v1/topics').set('Authorization', `Bearer ${user.accessToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.items).toContainEqual({ code: 'technology', name: 'Công nghệ' });
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: user.userId } })).emailVerifiedAt).toBeNull();
    expect(await catalog()).toEqual(before);
  });

  it('topics: taxonomy.manage creates valid codes, invalid codes return 400, PATCH archives without altering a published sense or its topic names', async () => {
    const editor = await staff();
    const user = await learner('vi');
    const code = `task-3-${randomUUID()}`;
    const res = await ctx.http().post('/v1/admin/taxonomy/topics')
      .set('Authorization', `Bearer ${editor.accessToken}`).send({ code, names: { vi: 'Chủ đề thử', en: 'Test topic' } });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ code, names: { vi: 'Chủ đề thử', en: 'Test topic' }, archived_at: null });
    expect(await ctx.prisma.topic.findUniqueOrThrow({ where: { code }, include: { names: true } })).toMatchObject({
      code, archivedAt: null, names: expect.arrayContaining([
        { topicCode: code, language: 'vi', name: 'Chủ đề thử' }, { topicCode: code, language: 'en', name: 'Test topic' },
      ]),
    });
    const beforeInvalid = await catalog();
    for (const invalidCode of ['', 'Uppercase', 'under_score', 'has space', 'slash/code', 'ẩm-thực', 'newline\n', 'newline\r\n']) {
      const invalid = await ctx.http().post('/v1/admin/taxonomy/topics')
        .set('Authorization', `Bearer ${editor.accessToken}`).send({ code: invalidCode, names: { en: 'Invalid' } });
      expect(invalid.status).toBe(400);
      expect(invalid.body.type).toBe(problem('validation-failed'));
      expect(await catalog()).toEqual(beforeInvalid);
    }
    const duplicate = await ctx.http().post('/v1/admin/taxonomy/topics')
      .set('Authorization', `Bearer ${editor.accessToken}`).send({ code, names: { vi: 'Must not replace' } });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.type).toBe(problem('topic-exists'));
    expect(await catalog()).toEqual(beforeInvalid);

    const entry = await ctx.prisma.entry.create({ data: { lemma: 'test topic', pos: 'noun' } });
    await ctx.prisma.entryLevel.create({ data: { entryId: entry.id, sourceId: OWNER_SOURCE_ID, level: 'A1', basis: 'editorial' } });
    const sense = await ctx.prisma.sense.create({ data: { entryId: entry.id } });
    const revision = await ctx.prisma.senseRevision.create({ data: {
      senseId: sense.id, revisionNo: 1, status: 'published', draftSource: 'ui', contentHash: 'published-topic-fixture',
      createdBy: editor.userId, publishedAt: ctx.clock.now(), topicCodes: [code], examples: ['This is a test topic.'],
      texts: { create: { language: 'vi', kind: 'gloss', text: 'chủ đề thử' } },
    } });
    const live = await ctx.prisma.sense.update({ where: { id: sense.id }, data: { liveRevisionId: revision.id } });
    const revisionBefore = await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: revision.id }, include: { texts: true } });
    const visible = await ctx.http().get('/v1/topics').set('Authorization', `Bearer ${user.accessToken}`);
    expect(visible.status).toBe(200);
    expect(visible.body.items).toContainEqual({ code, name: 'Chủ đề thử' });
    const archived = await ctx.http().patch(`/v1/admin/taxonomy/topics/${code}`)
      .set('Authorization', `Bearer ${editor.accessToken}`).send({ archived: true });
    expect(archived.status).toBe(200);
    expect(archived.body).toEqual({ code, names: { vi: 'Chủ đề thử', en: 'Test topic' }, archived_at: ctx.clock.now().toISOString() });
    const hidden = await ctx.http().get('/v1/topics').set('Authorization', `Bearer ${user.accessToken}`);
    expect(hidden.status).toBe(200);
    expect(hidden.body.items.map((item: { code: string }) => item.code)).not.toContain(code);
    expect(await ctx.prisma.sense.findUniqueOrThrow({ where: { id: sense.id } })).toEqual(live);
    expect(await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: revision.id }, include: { texts: true } })).toEqual(revisionBefore);
    // Task 8 verifies the learner sense response; retain all data needed to show this archived topic there.
    expect(await ctx.prisma.topic.findUniqueOrThrow({ where: { code }, include: { names: true } })).toMatchObject({
      archivedAt: ctx.clock.now(), names: expect.arrayContaining([
        { topicCode: code, language: 'vi', name: 'Chủ đề thử' }, { topicCode: code, language: 'en', name: 'Test topic' },
      ]),
    });
  });

  it('topics: partial names preserve other languages, archived=false restores visibility, and an empty PATCH keeps stored state', async () => {
    const editor = await staff();
    const user = await learner('en');
    const code = `task-3-${randomUUID()}`;
    expect((await ctx.http().post('/v1/admin/taxonomy/topics').set('Authorization', `Bearer ${editor.accessToken}`)
      .send({ code, names: { vi: 'Tên cũ', en: 'English name' } })).status).toBe(201);
    const patch = (body: object) => ctx.http().patch(`/v1/admin/taxonomy/topics/${code}`)
      .set('Authorization', `Bearer ${editor.accessToken}`).send(body);
    const archived = await patch({ names: { vi: 'Tên mới' }, archived: true });
    expect(archived.status).toBe(200);
    expect(archived.body.names).toEqual({ vi: 'Tên mới', en: 'English name' });
    const stored = await ctx.prisma.topic.findUniqueOrThrow({ where: { code }, include: { names: true } });
    expect(stored).toMatchObject({ archivedAt: ctx.clock.now(), names: expect.arrayContaining([
      { topicCode: code, language: 'vi', name: 'Tên mới' }, { topicCode: code, language: 'en', name: 'English name' },
    ]) });
    ctx.clock.advance(1_000);
    expect((await patch({})).status).toBe(200);
    expect((await patch({ archived: true })).status).toBe(200);
    expect(await ctx.prisma.topic.findUniqueOrThrow({ where: { code }, include: { names: true } })).toEqual(stored);
    const restored = await patch({ archived: false });
    expect(restored.status).toBe(200);
    expect(restored.body.archived_at).toBeNull();
    expect((await ctx.prisma.topic.findUniqueOrThrow({ where: { code } })).archivedAt).toBeNull();
    const visible = await ctx.http().get('/v1/topics').set('Authorization', `Bearer ${user.accessToken}`);
    expect(visible.status).toBe(200);
    expect(visible.body.items).toContainEqual({ code, name: 'English name' });
  });

  it('topics: names use the current learner language, then English, then code', async () => {
    const editor = await staff();
    const user = await learner('vi');
    const prefix = `task-3-${randomUUID()}`;
    for (const body of [
      { code: `${prefix}-both`, names: { vi: 'Tên Việt', en: 'English name' } },
      { code: `${prefix}-english`, names: { en: 'English fallback' } },
      { code: `${prefix}-vietnamese`, names: { vi: 'Chỉ tiếng Việt' } },
      { code: `${prefix}-none`, names: {} },
    ]) {
      expect((await ctx.http().post('/v1/admin/taxonomy/topics').set('Authorization', `Bearer ${editor.accessToken}`)
        .send(body)).status).toBe(201);
    }
    const vietnamese = await ctx.http().get('/v1/topics').set('Authorization', `Bearer ${user.accessToken}`);
    expect(vietnamese.status).toBe(200);
    expect(vietnamese.body.items).toEqual(expect.arrayContaining([
      { code: `${prefix}-both`, name: 'Tên Việt' }, { code: `${prefix}-english`, name: 'English fallback' },
      { code: `${prefix}-vietnamese`, name: 'Chỉ tiếng Việt' }, { code: `${prefix}-none`, name: `${prefix}-none` },
    ]));
    expect((await ctx.http().patch('/v1/me').set('Authorization', `Bearer ${user.accessToken}`)
      .send({ native_language: 'en' })).status).toBe(200);
    const english = await ctx.http().get('/v1/topics').set('Authorization', `Bearer ${user.accessToken}`);
    expect(english.status).toBe(200);
    expect(english.body.items).toEqual(expect.arrayContaining([
      { code: `${prefix}-both`, name: 'English name' }, { code: `${prefix}-english`, name: 'English fallback' },
      { code: `${prefix}-vietnamese`, name: `${prefix}-vietnamese` }, { code: `${prefix}-none`, name: `${prefix}-none` },
    ]));
  });

  it('topics: invalid names and patches, unknown topics, and learners attempting taxonomy writes leave persisted catalog state unchanged', async () => {
    const editor = await staff();
    const user = await learner('vi');
    const before = await catalog();
    for (const body of [
      { code: 'invalid-names', names: { fr: 'Interdit' } }, { code: 'invalid-names', names: { vi: ' ' } },
      { code: 'invalid-names' }, { code: 'invalid-names', names: {}, archived: true },
    ]) {
      const res = await ctx.http().post('/v1/admin/taxonomy/topics').set('Authorization', `Bearer ${editor.accessToken}`).send(body);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('validation-failed'));
      expect(await catalog()).toEqual(before);
    }
    for (const [code, body, status, slug] of [
      ['technology', { names: { en: '' } }, 400, 'validation-failed'],
      ['technology', { names: { fr: 'Interdit' } }, 400, 'validation-failed'],
      ['technology', { archived: 'true' }, 400, 'validation-failed'],
      ['technology', { archived_at: null }, 400, 'validation-failed'],
      ['Invalid_code', { archived: true }, 400, 'validation-failed'],
      [`missing-${randomUUID()}`, { archived: true, names: { en: 'Missing' } }, 404, 'not-found'],
    ] as const) {
      const res = await ctx.http().patch(`/v1/admin/taxonomy/topics/${code}`)
        .set('Authorization', `Bearer ${editor.accessToken}`).send(body);
      expect(res.status).toBe(status);
      expect(res.body.type).toBe(problem(slug));
      expect(await catalog()).toEqual(before);
    }
    // Build each request lazily: a supertest request created early listens on, then closes, the shared server.
    for (const req of [
      () => ctx.http().post('/v1/admin/taxonomy/topics').send({ code: 'learner-topic', names: { vi: 'Forbidden' } }),
      () => ctx.http().patch('/v1/admin/taxonomy/topics/technology').send({ archived: true }),
    ]) {
      const res = await req().set('Authorization', `Bearer ${user.accessToken}`);
      expect(res.status).toBe(403);
      expect(res.body.type).toBe(problem('forbidden'));
      expect(await catalog()).toEqual(before);
    }
  });

  it('B25#17a: an editor without native_language lists every topic, archived ones with archived_at, ordered by code; a learner gets 403 forbidden', async () => {
    const archivedAt = new Date('2026-10-01T00:00:00Z');
    // Migration-seeded topics stay in every suite, so the list is checked as seeded + these three.
    await ctx.prisma.topic.create({ data: { code: 'b25-food', names: { create: [{ language: 'vi', name: 'Đồ ăn' }, { language: 'en', name: 'Food' }] } } });
    await ctx.prisma.topic.create({ data: { code: 'b25-business', archivedAt, names: { create: [{ language: 'en', name: 'Business' }] } } });
    await ctx.prisma.topic.create({ data: { code: 'b25-animals', names: { create: [{ language: 'vi', name: 'Động vật' }] } } });
    const stored = await topics();
    const editor = await staff();
    const res = await ctx.http().get('/v1/admin/taxonomy/topics').set('Authorization', `Bearer ${editor.accessToken}`);
    expect(res.status).toBe(200);
    const codes = res.body.items.map((item: { code: string }) => item.code);
    expect(codes).toEqual(stored.map((topic) => topic.code));
    expect(codes.length).toBeGreaterThan(3);
    expect(codes.indexOf('b25-animals')).toBeLessThan(codes.indexOf('b25-business'));
    expect(codes.indexOf('b25-business')).toBeLessThan(codes.indexOf('b25-food'));
    expect(res.body.items.filter((item: { code: string }) => item.code.startsWith('b25-'))).toEqual([
      { code: 'b25-animals', names: { vi: 'Động vật' }, archived_at: null },
      { code: 'b25-business', names: { en: 'Business' }, archived_at: archivedAt.toISOString() },
      { code: 'b25-food', names: { vi: 'Đồ ăn', en: 'Food' }, archived_at: null },
    ]);
    const denied = await ctx.http().get('/v1/admin/taxonomy/topics')
      .set('Authorization', `Bearer ${(await learner('vi')).accessToken}`);
    expect(denied.status).toBe(403);
    expect(denied.body.type).toBe(problem('forbidden'));
  });
});
