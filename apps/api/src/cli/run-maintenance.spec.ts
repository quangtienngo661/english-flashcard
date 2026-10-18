import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const runAll = vi.fn(); const disconnect = vi.fn(); const close = vi.fn();
  const app = { get: vi.fn((key) => key === 'PRISMA_CLIENT' ? { $disconnect: disconnect } : { runAll }), close };
  return { runAll, disconnect, close, app, create: vi.fn(), exists: vi.fn(), config: vi.fn(), forRoot: vi.fn() };
});
vi.mock('node:fs', () => ({ existsSync: mocks.exists }));
vi.mock('@nestjs/core', () => ({ NestFactory: { createApplicationContext: mocks.create } }));
vi.mock('../app.module.js', () => ({ AppModule: { forRoot: mocks.forRoot } }));
vi.mock('../common/config/app-config.js', () => ({ loadConfig: mocks.config, APP_CONFIG: Symbol('APP_CONFIG') }));
vi.mock('../common/db/prisma.module.js', () => ({ PRISMA_CLIENT: 'PRISMA_CLIENT' }));

describe('maintenance:run CLI', () => {
  let exitCode: typeof process.exitCode;
  const run = async () => { await import('./run-maintenance.js'); };
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); exitCode = process.exitCode; process.exitCode = undefined;
    mocks.exists.mockReturnValue(false); mocks.create.mockResolvedValue(mocks.app);
    mocks.config.mockReturnValue({ databaseUrl: 'test' }); mocks.forRoot.mockReturnValue('module');
    mocks.runAll.mockResolvedValue(undefined); mocks.disconnect.mockResolvedValue(undefined); mocks.close.mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { process.exitCode = exitCode; vi.restoreAllMocks(); });

  it('boots the app context once, runs every maintenance job once, exits 0 and closes both resources', async () => {
    await run();
    expect(mocks.config).toHaveBeenCalledWith(process.env); expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create).toHaveBeenCalledWith('module');
    expect(mocks.runAll).toHaveBeenCalledOnce(); expect(process.exitCode).toBe(0);
    expect(mocks.disconnect).toHaveBeenCalledOnce(); expect(mocks.close).toHaveBeenCalledOnce();
  });
  it('loads .env when present before parsing config', async () => {
    mocks.exists.mockReturnValue(true); const env = vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {});
    await run(); expect(env).toHaveBeenCalledWith('.env');
    expect(env.mock.invocationCallOrder[0]).toBeLessThan(mocks.config.mock.invocationCallOrder[0]);
  });
  it('a failure outside the jobs exits 1, closes resources and does not print raw library messages', async () => {
    mocks.runAll.mockRejectedValue(new Error('secret database connection')); await run();
    expect(process.exitCode).toBe(1); expect(console.error).toHaveBeenCalledWith('maintenance:run failed');
    expect(mocks.disconnect).toHaveBeenCalledOnce(); expect(mocks.close).toHaveBeenCalledOnce();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret');
  });
  it('a boot failure exits 1 without running jobs', async () => {
    mocks.create.mockRejectedValue(new Error('no database')); await run();
    expect(process.exitCode).toBe(1); expect(mocks.runAll).not.toHaveBeenCalled();
  });
});
