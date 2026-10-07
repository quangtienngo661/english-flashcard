import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const grant = vi.fn(); const disconnect = vi.fn(); const close = vi.fn();
  const app = { get: vi.fn((key) => key === 'PRISMA_CLIENT' ? { $disconnect: disconnect } : { grantAdminByEmail: grant }), close };
  return { grant, disconnect, close, app, create: vi.fn(), exists: vi.fn(), config: vi.fn(), forRoot: vi.fn() };
});
vi.mock('node:fs', () => ({ existsSync: mocks.exists }));
vi.mock('@nestjs/core', () => ({ NestFactory: { createApplicationContext: mocks.create } }));
vi.mock('../app.module.js', () => ({ AppModule: { forRoot: mocks.forRoot } }));
vi.mock('../common/config/app-config.js', () => ({ loadConfig: mocks.config }));

describe('admin:grant CLI', () => {
  let argv: string[]; let exitCode: typeof process.exitCode;
  const run = async () => { await import('./admin-grant.js'); };
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks(); argv = process.argv; exitCode = process.exitCode;
    process.argv = ['node', 'dist/cli/admin-grant.js', 'a@example.com']; process.exitCode = undefined;
    mocks.exists.mockReturnValue(false); mocks.create.mockResolvedValue(mocks.app);
    mocks.config.mockReturnValue({ databaseUrl: 'test' }); mocks.forRoot.mockReturnValue('module');
    mocks.grant.mockResolvedValue('granted'); mocks.disconnect.mockResolvedValue(undefined); mocks.close.mockResolvedValue(undefined);
    vi.spyOn(console, 'log').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { process.argv = argv; process.exitCode = exitCode; vi.restoreAllMocks(); });
  it('B1#29: grants inside an operation context, prints granted, exits 0 and closes both resources', async () => {
    mocks.grant.mockImplementation(async (email) => {
      const { getOperationId } = await import('../common/logging/request-context.js');
      expect(email).toBe('a@example.com'); expect(getOperationId()).toMatch(/^[0-9a-f-]{36}$/); return 'granted';
    });
    await run();
    expect(mocks.config).toHaveBeenCalledWith(process.env); expect(mocks.create).toHaveBeenCalledWith('module');
    expect(console.log).toHaveBeenCalledWith('granted'); expect(process.exitCode).toBe(0);
    expect(mocks.disconnect).toHaveBeenCalledOnce(); expect(mocks.close).toHaveBeenCalledOnce();
  });
  it.each(['not_found', 'unverified'])('B1#29/B1E27: %s exits 1 and prints the outcome', async (outcome) => {
    mocks.grant.mockResolvedValue(outcome); await run();
    expect(process.exitCode).toBe(1); expect(console.log).toHaveBeenCalledWith(outcome);
    if (outcome === 'not_found') expect(console.log).toHaveBeenCalledWith('register this email first');
    expect(mocks.disconnect).toHaveBeenCalledOnce(); expect(mocks.close).toHaveBeenCalledOnce();
  });
  it('B1#29: loads .env when present before parsing config', async () => {
    mocks.exists.mockReturnValue(true); const env = vi.spyOn(process, 'loadEnvFile').mockImplementation(() => {});
    await run(); expect(env).toHaveBeenCalledWith('.env');
    expect(env.mock.invocationCallOrder[0]).toBeLessThan(mocks.config.mock.invocationCallOrder[0]);
  });
  it('B1#29: missing argument prints usage and exits 1 without bootstrapping', async () => {
    process.argv = ['node', 'dist/cli/admin-grant.js']; await run();
    expect(process.exitCode).toBe(1); expect(console.error).toHaveBeenCalledWith('Usage: pnpm admin:grant <email>');
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.grant).not.toHaveBeenCalled();
  });
  it('B1#29: grant errors exit 1, close resources and do not print raw library messages', async () => {
    mocks.grant.mockRejectedValue(new Error('secret database connection')); await run();
    expect(process.exitCode).toBe(1); expect(console.error).toHaveBeenCalledWith('admin:grant failed');
    expect(mocks.disconnect).toHaveBeenCalledOnce(); expect(mocks.close).toHaveBeenCalledOnce();
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret');
  });
  it('B1#29: application still closes when database disconnect fails', async () => {
    mocks.disconnect.mockRejectedValue(new Error('disconnect failed')); await run();
    expect(process.exitCode).toBe(1); expect(mocks.close).toHaveBeenCalledOnce();
  });
});
