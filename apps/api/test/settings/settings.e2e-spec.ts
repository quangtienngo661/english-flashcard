import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SETTINGS_BOUNDS, SettingsService } from '../../src/settings/index.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { listRoutes } from '../support/list-routes.js';

const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const defaults = {
  reminders: { enabled: true, send_time: '20:00', min_gap_days: 2, inactive_after_days: 7, stop_after_days: 60 },
  learning: { new_per_group_per_day: 20, reviews_per_group_per_day: 100, backlog_after_days: 60 },
  practice: {
    max_questions_per_session: 20, default_questions_per_session: 10, history_months: 6, true_false_true_percent: 50,
    idle_session_close_hours: 24, reports_per_hour: 20, hint_definition_max_chars: 200, type_word_max_retries: null,
  },
};

describe('admin settings (e2e, isolated database)', () => {
  let ctx: TestApp;
  const stored = () => Promise.all([
    ctx.prisma.appSetting.findMany(), ctx.prisma.appSettingChange.findMany({ orderBy: { id: 'asc' } }),
  ]);
  const signIn = async (staffRole?: 'admin' | 'editor') => {
    const user = await seedUser(ctx.prisma, { verified: true, staffRole });
    return { ...user, token: (await startSession(ctx, user.userId)).accessToken };
  };
  const put = (token: string, body: unknown, key: string = randomUUID()) => ctx.http().put('/v1/admin/settings')
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send(body as object);
  const get = (token: string, path = '/v1/admin/settings') => ctx.http().get(path).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  beforeEach(async () => {
    await ctx.prisma.appSettingChange.deleteMany();
    await ctx.prisma.appSetting.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-17T09:00:00Z'));
  });
  afterAll(async () => { await ctx?.close(); });

  it('B3#19: PUT changes a value, GET returns it, history has actor, time, old and new value for each changed key only', async () => {
    const admin = await signIn('admin');
    const fresh = await get(admin.token);
    expect(fresh.status).toBe(200);
    expect(fresh.body).toEqual({ version: 0, values: defaults, bounds: SETTINGS_BOUNDS });
    expect(await ctx.app.get(SettingsService).get()).toEqual({
      reminders: { enabled: true, sendTime: '20:00', minGapDays: 2, inactiveAfterDays: 7, stopAfterDays: 60 },
      learning: { newPerGroupPerDay: 20, reviewsPerGroupPerDay: 100, backlogAfterDays: 60 },
      practice: {
        maxQuestionsPerSession: 20, defaultQuestionsPerSession: 10, historyMonths: 6, trueFalseTruePercent: 50,
        idleSessionCloseHours: 24, reportsPerHour: 20, hintDefinitionMaxChars: 200, typeWordMaxRetries: null,
      },
    });

    // min_gap_days is sent unchanged: it must not appear in the history.
    const first = await put(admin.token, { version: 0, values: { reminders: { send_time: '21:00', min_gap_days: 2 } } });
    expect(first.status).toBe(200);
    const afterFirst = { ...defaults, reminders: { ...defaults.reminders, send_time: '21:00' } };
    expect(first.body).toEqual({ version: 1, values: afterFirst });
    expect((await get(admin.token)).body).toEqual({ version: 1, values: afterFirst, bounds: SETTINGS_BOUNDS });
    expect((await ctx.app.get(SettingsService).get()).reminders.sendTime).toBe('21:00');

    ctx.clock.set(new Date('2026-10-17T10:30:00Z'));
    const other = await signIn('admin');
    const second = await put(other.token, { version: 1, values: {
      reminders: { enabled: false }, learning: { backlog_after_days: 90 } } });
    expect(second.status).toBe(200);
    expect(second.body.version).toBe(2);
    const [[row]] = await stored();
    expect(row).toMatchObject({ key: 'global', version: 2, updatedBy: other.userId, updatedAt: new Date('2026-10-17T10:30:00Z') });

    // The first admin's access token expired while the clock moved on.
    admin.token = (await startSession(ctx, admin.userId)).accessToken;
    const history = await get(admin.token, '/v1/admin/settings/history');
    expect(history.status).toBe(200);
    expect(history.body.next_page_token).toBeNull();
    expect(history.body.items).toHaveLength(3);
    // Newest first; the two changes of one save share a time, so their order is not asserted.
    expect(history.body.items.slice(0, 2)).toEqual(expect.arrayContaining([
      { key: 'reminders.enabled', old_value: true, new_value: false,
        changed_by: { id: other.userId, email: other.email }, changed_at: '2026-10-17T10:30:00.000Z' },
      { key: 'learning.backlog_after_days', old_value: 60, new_value: 90,
        changed_by: { id: other.userId, email: other.email }, changed_at: '2026-10-17T10:30:00.000Z' },
    ]));
    expect(history.body.items[2]).toEqual({ key: 'reminders.send_time', old_value: '20:00', new_value: '21:00',
      changed_by: { id: admin.userId, email: admin.email }, changed_at: '2026-10-17T09:00:00.000Z' });

    // Paging visits every change once, newest first.
    const seen: string[] = [];
    let token: string | null = null;
    do {
      const page = await get(admin.token, `/v1/admin/settings/history?page_size=1${token ? `&page_token=${token}` : ''}`);
      expect(page.status).toBe(200);
      expect(page.body.items).toHaveLength(1);
      seen.push(page.body.items[0].key);
      token = page.body.next_page_token;
    } while (token);
    expect(seen.sort()).toEqual(['learning.backlog_after_days', 'reminders.enabled', 'reminders.send_time']);
    expect((await get(admin.token, '/v1/admin/settings/history?page_token=nope')).status).toBe(400);
  });

  it('B3E30: send_time 23:00, min_gap_days 8, stop_after ≤ inactive_after → 400 validation-failed naming the key, nothing stored', async () => {
    const admin = await signIn('admin');
    await put(admin.token, { version: 0, values: { reminders: { min_gap_days: 4 } } });
    const before = await stored();
    const cases: Array<[unknown, string]> = [
      [{ reminders: { send_time: '23:00' } }, 'values.reminders.send_time'],
      [{ reminders: { min_gap_days: 8 } }, 'values.reminders.min_gap_days'],
      [{ reminders: { stop_after_days: 30, inactive_after_days: 30 } }, 'values.reminders.stop_after_days'],
      [{ learning: { reviews_per_group_per_day: 501 } }, 'values.learning.reviews_per_group_per_day'],
    ];
    for (const [values, key] of cases) {
      const res = await put(admin.token, { version: 1, values });
      expect(res.status, key).toBe(400);
      expect(res.body.type, key).toBe(problem('validation-failed'));
      expect(res.body.violations.join('\n'), key).toContain(key);
      expect(await stored(), key).toEqual(before);
    }
    // inactive_after_days alone may not reach the stored stop_after_days either.
    await put(admin.token, { version: 1, values: { reminders: { stop_after_days: 30 } } });
    const raise = await put(admin.token, { version: 2, values: { reminders: { inactive_after_days: 30 } } });
    expect(raise.status).toBe(400);
    expect(raise.body.violations).toEqual(['values.reminders.stop_after_days: Expected greater than inactive_after_days']);
    expect((await put(admin.token, { values: {} })).status).toBe(400);
    expect((await put(admin.token, { version: 2, values: { reminders: { tick: 1 } } })).status).toBe(400);
  });

  it('GET /v1/admin/settings returns the practice defaults and the new bounds', async () => {
    const admin = await signIn('admin');
    const res = await get(admin.token);
    expect(res.status).toBe(200);
    expect(res.body.values.practice).toEqual(defaults.practice);
    expect(res.body.bounds.practice).toEqual({
      max_questions_per_session: { min: 5, max: 100 },
      default_questions_per_session: { min: 1, max: 100 },
      history_months: { min: 3, max: 24 },
      true_false_true_percent: { min: 20, max: 80 },
      idle_session_close_hours: { min: 1, max: 168 },
      reports_per_hour: { min: 5, max: 100 },
      hint_definition_max_chars: { min: 80, max: 500 },
      type_word_max_retries: { min: 1, max: 10, nullable: true },
    });
  });

  it('PUT practice values within bounds saves and records history rows', async () => {
    const admin = await signIn('admin');
    const res = await put(admin.token, { version: 0, values: { practice: {
      max_questions_per_session: 30, default_questions_per_session: 15, history_months: 12, type_word_max_retries: 3 } } });
    expect(res.status).toBe(200);
    const saved = { ...defaults.practice, max_questions_per_session: 30, default_questions_per_session: 15, history_months: 12,
      type_word_max_retries: 3 };
    expect(res.body).toEqual({ version: 1, values: { ...defaults, practice: saved } });
    expect((await get(admin.token)).body.values.practice).toEqual(saved);
    expect((await ctx.app.get(SettingsService).get()).practice).toMatchObject({
      maxQuestionsPerSession: 30, defaultQuestionsPerSession: 15, historyMonths: 12, typeWordMaxRetries: 3 });
    const changes = await ctx.prisma.appSettingChange.findMany();
    expect(changes.map(({ key, oldValue, newValue }) => ({ key, oldValue, newValue }))).toEqual(expect.arrayContaining([
      { key: 'practice.max_questions_per_session', oldValue: 20, newValue: 30 },
      { key: 'practice.default_questions_per_session', oldValue: 10, newValue: 15 },
      { key: 'practice.history_months', oldValue: 6, newValue: 12 },
      { key: 'practice.type_word_max_retries', oldValue: null, newValue: 3 },
    ]));
    expect(changes).toHaveLength(4);
  });

  it('type_word_max_retries 3 → null saves and the history row reads back old 3, new null', async () => {
    const admin = await signIn('admin');
    expect((await put(admin.token, { version: 0, values: { practice: { type_word_max_retries: 3 } } })).status).toBe(200);
    ctx.clock.set(new Date('2026-10-17T09:05:00Z'));
    const cleared = await put(admin.token, { version: 1, values: { practice: { type_word_max_retries: null } } });
    expect(cleared.status).toBe(200);
    expect(cleared.body.values.practice.type_word_max_retries).toBeNull();
    expect((await get(admin.token)).body.values.practice.type_word_max_retries).toBeNull();
    expect((await ctx.app.get(SettingsService).get()).practice.typeWordMaxRetries).toBeNull();
    const history = await get(admin.token, '/v1/admin/settings/history');
    expect(history.body.items.map(({ key, old_value, new_value }: { key: string; old_value: unknown; new_value: unknown }) =>
      ({ key, old_value, new_value }))).toEqual([
      { key: 'practice.type_word_max_retries', old_value: 3, new_value: null },
      { key: 'practice.type_word_max_retries', old_value: null, new_value: 3 },
    ]);
  });

  it('B4E38: default 30 with max 20 → 400 validation-failed and nothing saved', async () => {
    const admin = await signIn('admin');
    const res = await put(admin.token, { version: 0, values: { practice: { default_questions_per_session: 30 } } });
    expect(res.status).toBe(400);
    expect(res.body.type).toBe(problem('validation-failed'));
    expect(res.body.violations).toEqual([
      'values.practice.default_questions_per_session: Expected at most max_questions_per_session']);
    expect(await stored()).toEqual([[], []]);
    expect((await get(admin.token)).body).toMatchObject({ version: 0, values: { practice: defaults.practice } });
  });

  it('type_word_max_retries 0 or 11 → 400', async () => {
    const admin = await signIn('admin');
    for (const value of [0, 11]) {
      const res = await put(admin.token, { version: 0, values: { practice: { type_word_max_retries: value } } });
      expect(res.status, String(value)).toBe(400);
      expect(res.body.type, String(value)).toBe(problem('validation-failed'));
    }
    expect(await stored()).toEqual([[], []]);
  });

  it('B3E31: two PUTs with the same version → the second 409 version-conflict and the stored value is the first', async () => {
    const admin = await signIn('admin');
    const other = await signIn('admin');
    expect((await put(admin.token, { version: 0, values: { learning: { new_per_group_per_day: 10 } } })).status).toBe(200);
    const stale = await put(other.token, { version: 0, values: { learning: { new_per_group_per_day: 30 } } });
    expect(stale.status).toBe(409);
    expect(stale.body.type).toBe(problem('version-conflict'));
    const after = await get(admin.token);
    expect(after.body.version).toBe(1);
    expect(after.body.values.learning.new_per_group_per_day).toBe(10);
    expect(await ctx.prisma.appSettingChange.count()).toBe(1);

    // Two saves racing on the same version: exactly one wins.
    const race = await Promise.all([30, 40].map((value, index) =>
      put([admin, other][index].token, { version: 1, values: { learning: { new_per_group_per_day: value } } })));
    expect(race.map((res) => res.status).sort()).toEqual([200, 409]);
    const winner = race.find((res) => res.status === 200)!.body.values.learning.new_per_group_per_day;
    expect((await get(admin.token)).body).toMatchObject({ version: 2, values: { learning: { new_per_group_per_day: winner } } });
    expect(await ctx.prisma.appSettingChange.count()).toBe(2);
  });

  it('PUT requires an Idempotency-Key and replays the stored result for the same key', async () => {
    const admin = await signIn('admin');
    const missing = await ctx.http().put('/v1/admin/settings').set('Authorization', `Bearer ${admin.token}`)
      .send({ version: 0, values: { reminders: { min_gap_days: 5 } } });
    expect(missing.status).toBe(400);
    expect(await stored()).toEqual([[], []]);
    const key = randomUUID();
    const body = { version: 0, values: { reminders: { min_gap_days: 5 } } };
    const first = await put(admin.token, body, key);
    const replay = await put(admin.token, body, key);
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    expect(await ctx.prisma.appSettingChange.count()).toBe(1);
  });

  it('editor and learner get 403; GET /v1/me lists settings.manage for admin only', async () => {
    const routes = listRoutes(ctx.app).filter(({ path }) => path.startsWith('/v1/admin/settings'));
    expect(routes).toEqual([
      { method: 'GET', path: '/v1/admin/settings', permissions: ['settings.manage'] },
      { method: 'PUT', path: '/v1/admin/settings', permissions: ['settings.manage'] },
      { method: 'GET', path: '/v1/admin/settings/history', permissions: ['settings.manage'] },
    ]);
    for (const role of ['editor', undefined] as const) {
      const user = await signIn(role);
      expect((await get(user.token)).status).toBe(403);
      expect((await get(user.token, '/v1/admin/settings/history')).status).toBe(403);
      const res = await put(user.token, { version: 0, values: { reminders: { enabled: false } } });
      expect(res.status).toBe(403);
      expect(res.body.type).toBe(problem('forbidden'));
      const me = await get(user.token, '/v1/me');
      expect(me.body.permissions).not.toContain('settings.manage');
    }
    expect(await stored()).toEqual([[], []]);
    const admin = await signIn('admin');
    expect((await get(admin.token, '/v1/me')).body.permissions).toContain('settings.manage');
  });
});
