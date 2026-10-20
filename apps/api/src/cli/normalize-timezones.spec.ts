import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../generated/prisma/client.js';
import { normalizeTimezones } from './normalize-timezones-run.js';

type Row = { id: string; email: string; timezone: string };

/** An in-memory `users` table that answers only the two calls the loop makes. */
function fakePrisma(rows: Row[], afterFirstRead?: () => void) {
  const findMany = vi.fn(async (args: { where?: { id?: { gt?: string } }; orderBy: { id: 'asc' }; take: number }) => {
    const after = args.where?.id?.gt;
    const page = rows.filter((row) => after === undefined || row.id > after).sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, args.take).map(({ id, timezone }) => ({ id, timezone }));
    if (findMany.mock.calls.length === 1) afterFirstRead?.();
    return page;
  });
  const updateMany = vi.fn(async (args: { where: { id: string; timezone: string }; data: { timezone: string } }) => {
    const matching = rows.filter((row) => row.id === args.where.id && row.timezone === args.where.timezone);
    for (const row of matching) row.timezone = args.data.timezone;
    return { count: matching.length };
  });
  return { prisma: { user: { findMany, updateMany } } as unknown as Pick<PrismaClient, 'user'>, findMany, updateMany };
}
const id = (n: number) => `u${String(n).padStart(5, '0')}`;

describe('normalizeTimezones', () => {
  it('normalize-timezones: rewrites only rows whose value changes, across pages of 500, and reports { scanned, changed }', async () => {
    const rows: Row[] = Array.from({ length: 1201 }, (_, n) => ({ id: id(n), email: `user${n}@example.test`, timezone: 'Asia/Saigon' }));
    rows[3].timezone = 'asia/ho_chi_minh'; rows[499].timezone = '+07:00'; rows[500].timezone = '-05:00';
    rows[900].timezone = '+05:30'; rows[1200].timezone = 'Mars/Base'; rows[7].timezone = 'UTC';
    const { prisma, findMany, updateMany } = fakePrisma(rows);

    expect(await normalizeTimezones(prisma)).toEqual({ scanned: 1201, changed: 5 });

    expect([rows[3], rows[499], rows[500], rows[900], rows[1200]].map((row) => row.timezone))
      .toEqual(['Asia/Saigon', 'Etc/GMT-7', 'Etc/GMT+5', 'UTC', 'UTC']);
    expect(rows[7].timezone).toBe('UTC');
    expect(updateMany).toHaveBeenCalledTimes(5);
    expect(updateMany.mock.calls.map(([args]) => args.where.id)).toEqual([id(3), id(499), id(500), id(900), id(1200)]);
    expect(findMany.mock.calls.map(([args]) => args.take)).toEqual([500, 500, 500]);
    expect(findMany.mock.calls.map(([args]) => args.where?.id?.gt)).toEqual([undefined, id(499), id(999)]);
    expect(await normalizeTimezones(prisma)).toEqual({ scanned: 1201, changed: 0 });
  });

  it('normalize-timezones: never reads or touches emails, and leaves a row alone that changed after it was read', async () => {
    const rows: Row[] = [
      { id: id(1), email: 'lan@example.test', timezone: '+07:00' },
      { id: id(2), email: 'minh@example.test', timezone: '+07:00' },
    ];
    const { prisma, findMany, updateMany } = fakePrisma(rows, () => { rows[1].timezone = 'Europe/Berlin'; });

    expect(await normalizeTimezones(prisma)).toEqual({ scanned: 2, changed: 1 });

    expect(rows.map((row) => row.timezone)).toEqual(['Etc/GMT-7', 'Europe/Berlin']);
    expect(JSON.stringify([findMany.mock.calls, updateMany.mock.calls])).not.toContain('example.test');
    for (const [args] of findMany.mock.calls) expect(args).toMatchObject({ select: { id: true, timezone: true } });
    for (const [args] of updateMany.mock.calls) expect(Object.keys(args.data)).toEqual(['timezone']);
  });

  it('normalize-timezones: an empty table scans nothing', async () => {
    expect(await normalizeTimezones(fakePrisma([]).prisma)).toEqual({ scanned: 0, changed: 0 });
  });
});

const mocks = vi.hoisted(() => {
  const disconnect = vi.fn(); const close = vi.fn(); const findMany = vi.fn(); const updateMany = vi.fn();
  const prisma = { $disconnect: disconnect, user: { findMany, updateMany } };
  const app = { get: vi.fn(() => prisma), close };
  return { disconnect, close, findMany, updateMany, app, create: vi.fn(), exists: vi.fn(), config: vi.fn(), forRoot: vi.fn() };
});
vi.mock('node:fs', () => ({ existsSync: mocks.exists }));
vi.mock('@nestjs/core', () => ({ NestFactory: { createApplicationContext: mocks.create } }));
vi.mock('../app.module.js', () => ({ AppModule: { forRoot: mocks.forRoot } }));
vi.mock('../common/config/app-config.js', () => ({ loadConfig: mocks.config, APP_CONFIG: Symbol('APP_CONFIG') }));
vi.mock('../common/db/prisma.module.js', () => ({ PRISMA_CLIENT: 'PRISMA_CLIENT' }));

describe('db:normalize-timezones CLI', () => {
  let exitCode: typeof process.exitCode;
  const run = async () => { await import('./normalize-timezones.js'); };
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); exitCode = process.exitCode; process.exitCode = undefined;
    mocks.exists.mockReturnValue(false); mocks.create.mockResolvedValue(mocks.app);
    mocks.config.mockReturnValue({ databaseUrl: 'test' }); mocks.forRoot.mockReturnValue('module');
    mocks.findMany.mockResolvedValueOnce([{ id: 'a', timezone: '+07:00' }, { id: 'b', timezone: 'Asia/Saigon' }]).mockResolvedValue([]);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.disconnect.mockResolvedValue(undefined); mocks.close.mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { process.exitCode = exitCode; vi.restoreAllMocks(); });

  it('normalize-timezones: prints exactly { scanned, changed }, exits 0 and closes both resources', async () => {
    await run();
    expect(mocks.config).toHaveBeenCalledWith(process.env); expect(mocks.create).toHaveBeenCalledWith('module', { logger: ['error'] });
    expect(console.log).toHaveBeenCalledExactlyOnceWith({ scanned: 2, changed: 1 });
    expect(mocks.updateMany).toHaveBeenCalledExactlyOnceWith({ where: { id: 'a', timezone: '+07:00' }, data: { timezone: 'Etc/GMT-7' } });
    expect(process.exitCode).toBe(0);
    expect(mocks.disconnect).toHaveBeenCalledOnce(); expect(mocks.close).toHaveBeenCalledOnce();
  });
  it('normalize-timezones: loads .env when present before parsing config', async () => {
    mocks.exists.mockReturnValue(true); const env = vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {});
    await run(); expect(env).toHaveBeenCalledWith('.env');
    expect(env.mock.invocationCallOrder[0]).toBeLessThan(mocks.config.mock.invocationCallOrder[0]);
  });
  it('normalize-timezones: a failure exits 1, closes resources and does not print raw library messages', async () => {
    mocks.findMany.mockReset().mockRejectedValue(new Error('secret database connection')); await run();
    expect(process.exitCode).toBe(1); expect(console.error).toHaveBeenCalledWith('db:normalize-timezones failed');
    expect(console.log).not.toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalledOnce(); expect(mocks.close).toHaveBeenCalledOnce();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret');
  });
});
