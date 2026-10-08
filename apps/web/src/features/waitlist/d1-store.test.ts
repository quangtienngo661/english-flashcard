import { openTestD1 } from '@/test/d1';
import { createD1Store } from './d1-store';

describe('createD1Store', () => {
  let db: D1Database;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await openTestD1());
  }, 60_000);

  beforeEach(async () => {
    await db.prepare('DELETE FROM waitlist').run();
  });

  afterAll(async () => {
    await dispose();
  });

  it('first add → created, row has email, locale and ISO created_at', async () => {
    const store = createD1Store(db, () => new Date('2026-10-08T03:04:05.000Z'));
    expect(await store.add('ten@gmail.com', 'vi')).toBe('created');
    expect(await db.prepare('SELECT * FROM waitlist').all()).toMatchObject({
      results: [{ email: 'ten@gmail.com', locale: 'vi', created_at: '2026-10-08T03:04:05.000Z' }],
    });
  });

  it('same email again → exists, row unchanged (locale and created_at kept)', async () => {
    let currentTime = new Date('2026-10-08T03:04:05.000Z');
    const store = createD1Store(db, () => currentTime);
    expect(await store.add('ten@gmail.com', 'vi')).toBe('created');

    currentTime = new Date('2026-10-08T04:05:06.000Z');
    expect(await store.add('ten@gmail.com', 'en')).toBe('exists');
    expect(await db.prepare('SELECT * FROM waitlist').all()).toMatchObject({
      results: [{ email: 'ten@gmail.com', locale: 'vi', created_at: '2026-10-08T03:04:05.000Z' }],
    });
  });

  it('DE2 two concurrent adds of one email → one created, one exists, one row', async () => {
    const store = createD1Store(db);
    const results = await Promise.all([store.add('a@b.co', 'en'), store.add('a@b.co', 'en')]);
    expect(results.sort()).toEqual(['created', 'exists']);
    expect((await db.prepare('SELECT COUNT(*) AS n FROM waitlist').first())?.n).toBe(1);
  });

  it('locale outside vi/en is rejected by the table', async () => {
    await expect(db.prepare('INSERT INTO waitlist VALUES (?1, ?2, ?3)').bind('x@y.co', 'fr', '2026-10-08').run()).rejects.toThrow();
  });
});
