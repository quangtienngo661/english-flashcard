import { describe, expect, it } from 'vitest';
import { AppLogger, type LogEntry } from './app-logger.js';
import { getOperationId, runWithOperationId } from './request-context.js';

function capture() {
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => logs.push(entry) });
  return { logs, logger };
}

describe('AppLogger', () => {
  it('B1#32: adds operation_id inside runWithOperationId', () => {
    const { logs, logger } = capture();
    runWithOperationId('op-1', () => logger.info('login_failed', { user_id: 'user-1' }));
    expect(logs).toEqual([{ level: 'info', event: 'login_failed', operation_id: 'op-1', user_id: 'user-1' }]);
    expect(getOperationId()).toBeUndefined();
  });

  it('B1#32: redacts password, code, refresh_token and cookie fields', () => {
    const { logs, logger } = capture();
    const fields = {
      password: 'secret', code: '012345', refresh_token: 'token', cookie: 'cookie-value',
      nested: [{ OTP: '012345', authorization: 'Bearer token', answer: 'answer', contextSentence: 'text' }],
      user_id: 'user-1',
    };
    logger.warn('test', fields);
    expect(logs[0]).toMatchObject({
      level: 'warn', event: 'test', password: '[redacted]', code: '[redacted]',
      refresh_token: '[redacted]', cookie: '[redacted]',
      nested: [{ OTP: '[redacted]', authorization: '[redacted]', answer: '[redacted]', contextSentence: '[redacted]' }],
      user_id: 'user-1',
    });
    expect(fields.password).toBe('secret');
  });

  it('B1#32: error() logs only name and code, never message', () => {
    const { logs, logger } = capture();
    const err = Object.assign(new Error('secret email@example.com'), { code: 'ECONNECTION', token: 'secret-token' });
    logger.error('mail_send_failed', err, { user_id: 'user-1' });
    expect(logs[0]).toEqual({
      level: 'error', event: 'mail_send_failed', error: { name: 'Error', code: 'ECONNECTION' }, user_id: 'user-1',
    });
    expect(JSON.stringify(logs)).not.toContain('secret');
    expect(JSON.stringify(logs)).not.toContain('email@example.com');
  });

  it('keeps concurrent asynchronous operation contexts separate', async () => {
    const { logs, logger } = capture();
    await Promise.all(['op-1', 'op-2'].map((id) => runWithOperationId(id, async () => {
      await Promise.resolve();
      logger.info('test');
    })));
    expect(logs.map((entry) => entry.operation_id)).toEqual(['op-1', 'op-2']);
  });

  it('serializes errors nested in fields and ignores caller overrides of log metadata', () => {
    const { logs, logger } = capture();
    runWithOperationId('op-1', () => logger.info('test', {
      event: 'forged', level: 'error', operation_id: 'forged', nested: new Error('private'),
    }));
    expect(logs[0]).toEqual({
      event: 'test', level: 'info', operation_id: 'op-1', nested: { name: 'Error' },
    });
  });
});
