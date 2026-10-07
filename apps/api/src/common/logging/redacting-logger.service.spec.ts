import { describe, expect, it, vi } from 'vitest';
import { RedactingLoggerService } from './redacting-logger.service.js';

describe('RedactingLoggerService', () => {
  it('redacts password/otp/token/answer/contextSentence fields before logging', () => {
    const sink = vi.fn();
    const logger = new RedactingLoggerService(sink);

    logger.log({
      password: 'secret',
      otp: '123456',
      token: 'abc',
      answer: 'cat',
      contextSentence: 'The cat sat',
      ok: 1,
      operationId: 'op-1',
    });

    const logged = JSON.stringify(sink.mock.calls[0]);
    expect(logged).not.toContain('secret');
    expect(logged).not.toContain('123456');
    expect(logged).not.toContain('abc');
    expect(logged).not.toContain('The cat sat');
    expect(logged).toContain('op-1');
  });
});
