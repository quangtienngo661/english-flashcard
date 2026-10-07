import { describe, expect, it } from 'vitest';
import { AppLogger, type LogEntry } from '../common/logging/app-logger.js';
import { runWithOperationId } from '../common/logging/request-context.js';
import { SampleController } from './sample.controller.js';

describe('SampleController', () => {
  it('B1#32: sample.create writes through AppLogger with the current operation_id', () => {
    const logs: LogEntry[] = [];
    const logger = new AppLogger({ write: (entry) => { logs.push(entry); } });
    const controller = new SampleController(logger);
    const result = runWithOperationId('sample-op', () => controller.create({ userId: 'user-1' }));
    expect(result.receivedAt).toEqual(expect.any(String));
    expect(logs).toEqual([{
      level: 'info', event: 'sample.create', user_id: 'user-1', operation_id: 'sample-op',
    }]);
  });
});
