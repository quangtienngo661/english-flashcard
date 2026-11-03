import { describe, expect, it } from 'vitest';
import { FakeClock } from '../common/clock/clock.js';
import { ProblemDetailsException } from '../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { LegalService } from './legal.service.js';

type Row = {
  id: string; number: number; status: string; rowVersion: number;
  privacyVi: string; termsVi: string; privacyEn: string | null; termsEn: string | null; effectiveDate: Date | null;
  createdBy: string; createdAt: Date; updatedBy: string; updatedAt: Date; publishedBy: string | null; publishedAt: Date | null;
};

/** A table in memory that understands the few `where` shapes the service uses. */
function fakePrisma() {
  const rows: Row[] = [];
  let seq = 0;
  const matches = (row: Row, where: Record<string, unknown> = {}) => Object.entries(where).every(([key, want]) => {
    const have = (row as unknown as Record<string, unknown>)[key];
    if (want !== null && typeof want === 'object' && !(want instanceof Date)) {
      const cond = want as { not?: unknown; lt?: number };
      if ('not' in cond && have === cond.not) return false;
      if ('lt' in cond && !(typeof have === 'number' && have < (cond.lt as number))) return false;
      return true;
    }
    return have === want;
  });
  const legalVersion = {
    findUnique: async ({ where }: { where: { id: string } }) => rows.find((row) => row.id === where.id) ?? null,
    findFirst: async ({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: { number: 'desc' } }) => {
      const found = rows.filter((row) => matches(row, where));
      if (orderBy) found.sort((a, b) => b.number - a.number);
      return found[0] ?? null;
    },
    findMany: async ({ where, take }: { where?: Record<string, unknown>; take?: number }) =>
      rows.filter((row) => matches(row, where)).sort((a, b) => b.number - a.number).slice(0, take ?? rows.length),
    create: async ({ data }: { data: Partial<Row> }) => {
      if (rows.some((row) => row.number === data.number)) throw Object.assign(new Error('unique'), { code: 'P2002' });
      const row = { id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`, rowVersion: 1, ...data } as Row;
      rows.push(row);
      return row;
    },
    updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
      const hit = rows.filter((row) => matches(row, where));
      for (const row of hit) {
        for (const [key, value] of Object.entries(data)) {
          const inc = value as { increment?: number };
          (row as unknown as Record<string, unknown>)[key] = typeof value === 'object' && value !== null && 'increment' in inc
            ? (row.rowVersion + (inc.increment as number)) : value;
        }
      }
      return { count: hit.length };
    },
    deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
      const hit = rows.filter((row) => matches(row, where));
      for (const row of hit) rows.splice(rows.indexOf(row), 1);
      return { count: hit.length };
    },
  };
  const prisma = { legalVersion, $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(prisma) };
  return { prisma, rows };
}

const ADMIN = '11111111-1111-4111-8111-111111111111';
const identity = { emailsOf: async (ids: string[]) => new Map(ids.map((id) => [id, 'admin@example.test'])) };

function setup() {
  const { prisma, rows } = fakePrisma();
  const clock = new FakeClock(new Date('2026-11-03T03:00:00.000Z'));
  const service = new LegalService(prisma as unknown as PrismaClient, identity as never, clock);
  return { service, rows, clock };
}

const FULL = {
  privacy_vi: '# Chính sách bảo mật', terms_vi: '# Điều khoản', privacy_en: null, terms_en: null, effective_date: '2026-11-10',
};

async function problem(promise: Promise<unknown>): Promise<{ status: number; type: string; extensions?: Record<string, unknown> }> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ProblemDetailsException) return { status: error.getStatus(), type: error.problemType, extensions: error.extensions };
    throw error;
  }
  throw new Error('expected a problem');
}

describe('LegalService.create', () => {
  it('starts an empty draft numbered 1 when nothing exists', async () => {
    const { service } = setup();
    const draft = await service.create(ADMIN);
    expect(draft).toMatchObject({ number: 1, status: 'draft', row_version: 1, privacy_vi: '', terms_vi: '', privacy_en: null, terms_en: null, effective_date: null });
  });

  it('copies the published version into the next number', async () => {
    const { service } = setup();
    const first = await service.create(ADMIN);
    await service.save(first.id, ADMIN, { expected_version: 1, ...FULL });
    await service.publish(first.id, ADMIN, { expected_version: 2 });
    const next = await service.create(ADMIN);
    expect(next).toMatchObject({ number: 2, status: 'draft', privacy_vi: '# Chính sách bảo mật', terms_vi: '# Điều khoản' });
  });

  it('copies a chosen version, and refuses an unknown one with 404', async () => {
    const { service } = setup();
    const a = await service.create(ADMIN);
    await service.save(a.id, ADMIN, { expected_version: 1, ...FULL, privacy_vi: 'A' });
    const b = await service.create(ADMIN, a.id);
    expect(b.privacy_vi).toBe('A');
    expect(await problem(service.create(ADMIN, '99999999-9999-4999-8999-999999999999'))).toMatchObject({ status: 404, type: 'not-found' });
  });
});

describe('LegalService.save', () => {
  it('replaces the texts and moves row_version on', async () => {
    const { service } = setup();
    const draft = await service.create(ADMIN);
    const saved = await service.save(draft.id, ADMIN, { expected_version: 1, ...FULL, privacy_en: '# Privacy' });
    expect(saved).toMatchObject({ row_version: 2, privacy_vi: '# Chính sách bảo mật', privacy_en: '# Privacy', effective_date: '2026-11-10' });
  });

  it('409 draft-version-conflict when the page is out of date, and nothing changes', async () => {
    const { service, rows } = setup();
    const draft = await service.create(ADMIN);
    await service.save(draft.id, ADMIN, { expected_version: 1, ...FULL });
    expect(await problem(service.save(draft.id, ADMIN, { expected_version: 1, ...FULL, privacy_vi: 'late' })))
      .toMatchObject({ status: 409, type: 'draft-version-conflict' });
    expect(rows[0].privacyVi).toBe('# Chính sách bảo mật');
  });

  it('409 not-a-draft for a published version, 404 for an unknown one', async () => {
    const { service } = setup();
    const draft = await service.create(ADMIN);
    await service.save(draft.id, ADMIN, { expected_version: 1, ...FULL });
    await service.publish(draft.id, ADMIN, { expected_version: 2 });
    expect(await problem(service.save(draft.id, ADMIN, { expected_version: 3, ...FULL }))).toMatchObject({ status: 409, type: 'not-a-draft' });
    expect(await problem(service.save('99999999-9999-4999-8999-999999999999', ADMIN, { expected_version: 1, ...FULL })))
      .toMatchObject({ status: 404, type: 'not-found' });
  });
});

describe('LegalService.remove', () => {
  it('deletes a draft and refuses anything that was ever published', async () => {
    const { service, rows } = setup();
    const draft = await service.create(ADMIN);
    await service.remove(draft.id);
    expect(rows).toHaveLength(0);
    const live = await service.create(ADMIN);
    await service.save(live.id, ADMIN, { expected_version: 1, ...FULL });
    await service.publish(live.id, ADMIN, { expected_version: 2 });
    expect(await problem(service.remove(live.id))).toMatchObject({ status: 409, type: 'not-a-draft' });
    expect(await problem(service.remove('99999999-9999-4999-8999-999999999999'))).toMatchObject({ status: 404, type: 'not-found' });
  });
});

describe('LegalService.publish', () => {
  it('needs both Vietnamese texts and an effective date', async () => {
    const { service } = setup();
    const draft = await service.create(ADMIN);
    const failed = await problem(service.publish(draft.id, ADMIN, { expected_version: 1 }));
    expect(failed).toMatchObject({ status: 400, type: 'validation-failed' });
    expect(failed.extensions).toEqual({ violations: ['privacy_vi', 'terms_vi', 'effective_date'] });
  });

  it('makes this version the only published one and supersedes the old one', async () => {
    const { service, rows, clock } = setup();
    const one = await service.create(ADMIN);
    await service.save(one.id, ADMIN, { expected_version: 1, ...FULL });
    await service.publish(one.id, ADMIN, { expected_version: 2 });
    const two = await service.create(ADMIN);
    clock.advance(60_000);
    await service.publish(two.id, ADMIN, { expected_version: 1 });
    expect(rows.map((row) => [row.number, row.status])).toEqual([[1, 'superseded'], [2, 'published']]);
    expect(rows[1].publishedBy).toBe(ADMIN);
    expect(rows[1].publishedAt).toEqual(new Date('2026-11-03T03:01:00.000Z'));
  });

  it('409 publish-stale when the draft changed since the page was read; 409 not-a-draft when already published', async () => {
    const { service } = setup();
    const draft = await service.create(ADMIN);
    await service.save(draft.id, ADMIN, { expected_version: 1, ...FULL });
    expect(await problem(service.publish(draft.id, ADMIN, { expected_version: 1 }))).toMatchObject({ status: 409, type: 'publish-stale' });
    await service.publish(draft.id, ADMIN, { expected_version: 2 });
    expect(await problem(service.publish(draft.id, ADMIN, { expected_version: 3 }))).toMatchObject({ status: 409, type: 'not-a-draft' });
  });
});

describe('LegalService reads', () => {
  it('current() is null with nothing published, then the published texts and the version "n"', async () => {
    const { service } = setup();
    expect(await service.current()).toBeNull();
    expect(await service.currentTermsVersion()).toBeNull();
    const draft = await service.create(ADMIN);
    expect(await service.current()).toBeNull();
    await service.save(draft.id, ADMIN, { expected_version: 1, ...FULL, privacy_en: '# Privacy' });
    await service.publish(draft.id, ADMIN, { expected_version: 2 });
    expect(await service.current()).toEqual({
      version: '1', effective_date: '2026-11-10',
      privacy: { vi: '# Chính sách bảo mật', en: '# Privacy' }, terms: { vi: '# Điều khoản', en: null },
    });
    expect(await service.currentTermsVersion()).toBe('1');
  });

  it('list() is newest first with no bodies, and pages by token', async () => {
    const { service } = setup();
    for (let i = 0; i < 3; i += 1) await service.create(ADMIN);
    const first = await service.list(2);
    expect(first.items.map((item) => item.number)).toEqual([3, 2]);
    expect(first.items[0]).not.toHaveProperty('privacy_vi');
    expect(first.next_page_token).not.toBeNull();
    const second = await service.list(2, first.next_page_token!);
    expect(second.items.map((item) => item.number)).toEqual([1]);
    expect(second.next_page_token).toBeNull();
  });

  it('get() returns the full texts, and 404 for an unknown id', async () => {
    const { service } = setup();
    const draft = await service.create(ADMIN);
    expect(await service.get(draft.id)).toMatchObject({ id: draft.id, privacy_vi: '' });
    expect(await problem(service.get('99999999-9999-4999-8999-999999999999'))).toMatchObject({ status: 404, type: 'not-found' });
  });
});
