import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const disconnect = vi.fn(); const close = vi.fn();
  const prisma = { $disconnect: disconnect };
  const normalize = vi.fn();
  const app = { get: vi.fn((key) => key === 'PRISMA_CLIENT' ? prisma : { normalizeStoredTimeZones: normalize }), close };
  return { disconnect, close, normalize, app, create: vi.fn(), exists: vi.fn(), config: vi.fn(), forRoot: vi.fn() };
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
    mocks.normalize.mockResolvedValue({ scanned: 2, changed: 1 });
    mocks.disconnect.mockResolvedValue(undefined); mocks.close.mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { process.exitCode = exitCode; vi.restoreAllMocks(); });

  it('normalize-timezones: prints exactly { scanned, changed }, exits 0 and closes both resources', async () => {
    await run();
    expect(mocks.config).toHaveBeenCalledWith(process.env); expect(mocks.create).toHaveBeenCalledWith('module', { logger: ['error'] });
    expect(console.log).toHaveBeenCalledExactlyOnceWith({ scanned: 2, changed: 1 });
    expect(mocks.normalize).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(0);
    expect(mocks.disconnect).toHaveBeenCalledOnce(); expect(mocks.close).toHaveBeenCalledOnce();
  });
  it('normalize-timezones: loads .env when present before parsing config', async () => {
    mocks.exists.mockReturnValue(true); const env = vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {});
    await run(); expect(env).toHaveBeenCalledWith('.env');
    expect(env.mock.invocationCallOrder[0]).toBeLessThan(mocks.config.mock.invocationCallOrder[0]);
  });
  it('normalize-timezones: a failure exits 1, closes resources and does not print raw library messages', async () => {
    mocks.normalize.mockRejectedValue(new Error('secret database connection')); await run();
    expect(process.exitCode).toBe(1); expect(console.error).toHaveBeenCalledWith('db:normalize-timezones failed');
    expect(console.log).not.toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalledOnce(); expect(mocks.close).toHaveBeenCalledOnce();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret');
  });
});
