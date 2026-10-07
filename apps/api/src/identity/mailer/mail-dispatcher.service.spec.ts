import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import { getOperationId, runWithOperationId } from '../../common/logging/request-context.js';
import { FakeMailer } from './fake-mailer.js';
import { MailBudget } from './mail-budget.service.js';
import { MailDispatcher, sendPrepared } from './mail-dispatcher.service.js';

const message = { to: 'a@example.com', subject: 'test', text: 'secret 123456' };

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function setup() {
  const logs: LogEntry[] = [];
  const logger = new AppLogger({ write: (entry) => { logs.push(entry); } });
  const mailer = new FakeMailer();
  const tryConsume = vi.fn(async () => true);
  const budget = { tryConsume } as unknown as MailBudget;
  const dispatcher = new MailDispatcher(mailer, budget, logger);
  const res = new EventEmitter() as EventEmitter & Response;
  return { logs, mailer, tryConsume, dispatcher, res };
}

describe('MailDispatcher', () => {
  it('B1#38: sends nothing on registration or finish; drain waits for close and sending', async () => {
    const { dispatcher, res, mailer, tryConsume } = setup();
    const job = vi.fn(sendPrepared(message));
    dispatcher.afterResponse(res, [job]);
    const drained = vi.fn();
    const drain = dispatcher.drain().then(drained);
    res.emit('finish');
    await Promise.resolve();
    expect(job).not.toHaveBeenCalled();
    expect(tryConsume).not.toHaveBeenCalled();
    expect(mailer.sent).toEqual([]);
    expect(drained).not.toHaveBeenCalled();
    res.emit('close');
    await drain;
    expect(job).toHaveBeenCalledTimes(1);
    expect(mailer.sent).toEqual([message]);
    expect(res.listenerCount('close')).toBe(0);
    res.emit('close');
    await dispatcher.drain();
    expect(mailer.sent).toHaveLength(1);
  });

  it('R1: application shutdown waits until a started batch has been sent', async () => {
    const { dispatcher, res, mailer } = setup();
    const gate = deferred();
    dispatcher.afterResponse(res, [async () => { await gate.promise; return message; }]);
    res.emit('close');
    const shutdown = vi.fn();
    const done = dispatcher.onApplicationShutdown().then(shutdown);
    await Promise.resolve();
    expect(shutdown).not.toHaveBeenCalled();
    gate.resolve();
    await done;
    expect(mailer.sent).toEqual([message]);
  });

  it('B1E16: a client abort (close without finish) still runs the batch', async () => {
    const { dispatcher, res, mailer } = setup();
    dispatcher.afterResponse(res, [sendPrepared(message)]);
    res.emit('close');
    await dispatcher.drain();
    expect(mailer.sent).toEqual([message]);
  });

  it('B1E16: a response already closed before registration still dispatches committed mail', async () => {
    const { dispatcher, res, mailer } = setup();
    res.destroyed = true;
    Object.defineProperty(res, 'closed', { value: true });
    res.emit('close');
    dispatcher.afterResponse(res, [sendPrepared(message)]);
    await dispatcher.drain();
    expect(mailer.sent).toEqual([message]);
    expect(res.listenerCount('close')).toBe(0);
  });

  it('B1E16: a destroyed response whose close event is pending still waits for close', async () => {
    const { dispatcher, res, mailer } = setup();
    res.destroyed = true;
    const job = vi.fn(sendPrepared(message));
    dispatcher.afterResponse(res, [job]);
    await Promise.resolve();
    expect(job).not.toHaveBeenCalled();
    expect(mailer.sent).toEqual([]);
    res.emit('close');
    await dispatcher.drain();
    expect(mailer.sent).toEqual([message]);
  });

  it('B1#38: drain waits for a running asynchronous job and an asynchronous send', async () => {
    const { dispatcher, mailer } = setup();
    const jobDone = deferred();
    const sendStarted = deferred();
    const sendDone = deferred();
    vi.spyOn(mailer, 'send').mockImplementation(async () => {
      sendStarted.resolve();
      await sendDone.promise;
    });
    dispatcher.runNow([async () => { await jobDone.promise; return message; }]);
    const drained = vi.fn();
    const drain = dispatcher.drain().then(drained);
    await Promise.resolve();
    expect(drained).not.toHaveBeenCalled();
    jobDone.resolve();
    await sendStarted.promise;
    expect(drained).not.toHaveBeenCalled();
    sendDone.resolve();
    await drain;
    expect(drained).toHaveBeenCalledOnce();
  });

  it('B1#38: drain includes a new pending batch registered while another is running', async () => {
    const { dispatcher, res, mailer } = setup();
    const gate = deferred();
    dispatcher.runNow([async () => { await gate.promise; return null; }]);
    const drained = vi.fn();
    const drain = dispatcher.drain().then(drained);
    dispatcher.afterResponse(res, [sendPrepared(message)]);
    gate.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(drained).not.toHaveBeenCalled();
    res.emit('close');
    await drain;
    expect(mailer.sent).toEqual([message]);
  });

  it('B1#38: a null job sends nothing and consumes no budget', async () => {
    const { dispatcher, tryConsume, mailer } = setup();
    dispatcher.runNow([sendPrepared(null)]);
    await dispatcher.drain();
    expect(tryConsume).not.toHaveBeenCalled();
    expect(mailer.sent).toEqual([]);
  });

  it.each(['job', 'budget', 'mailer'] as const)(
    'B1E16/IE6: a failing %s is sanitized, drain resolves and the next job still sends', async (phase) => {
      const { dispatcher, tryConsume, mailer, logs } = setup();
      const error = Object.assign(new Error('a@example.com secret 123456'), { code: 'ETEST' });
      if (phase === 'budget') tryConsume.mockRejectedValueOnce(error);
      if (phase === 'mailer') mailer.failNext(error);
      dispatcher.runNow([
        phase === 'job' ? async () => { throw error; } : sendPrepared(message),
        sendPrepared(message),
      ]);
      await expect(dispatcher.drain()).resolves.toBeUndefined();
      expect(mailer.sent).toEqual([message]);
      expect(logs).toEqual([expect.objectContaining({
        level: 'error', event: 'mail_send_failed', error: { name: 'Error', code: 'ETEST' },
      })]);
      expect(JSON.stringify(logs)).not.toContain('a@example.com');
      expect(JSON.stringify(logs)).not.toContain('123456');
      expect(logs[0]).not.toHaveProperty('message');
    },
  );

  it('B1E15: exhausted budget skips sending, logs safely and settles', async () => {
    const { dispatcher, tryConsume, mailer, logs } = setup();
    tryConsume.mockResolvedValue(false);
    dispatcher.runNow([sendPrepared(message)]);
    await dispatcher.drain();
    expect(mailer.sent).toEqual([]);
    expect(logs).toEqual([expect.objectContaining({
      event: 'mail_send_failed', error: { name: expect.any(String), code: expect.any(String) },
    })]);
    expect(JSON.stringify(logs)).not.toContain(message.to);
  });

  it('B1#32: concurrent batches re-enter their own operation_id for jobs, budget and error logs', async () => {
    const { dispatcher, res, tryConsume, logs } = setup();
    const other = new EventEmitter() as EventEmitter & Response;
    const seen: Array<string | undefined> = [];
    const gate = deferred();
    const job = async () => {
      await gate.promise;
      seen.push(getOperationId());
      return message;
    };
    tryConsume.mockImplementation(async () => {
      seen.push(getOperationId());
      throw Object.assign(new Error('private'), { code: 'ETEST' });
    });
    runWithOperationId('request-a', () => dispatcher.afterResponse(res, [job]));
    runWithOperationId('request-b', () => dispatcher.afterResponse(other, [job]));
    runWithOperationId('unrelated', () => { other.emit('close'); res.emit('close'); });
    gate.resolve();
    await dispatcher.drain();
    expect(seen.filter((id) => id === 'request-a')).toHaveLength(2);
    expect(seen.filter((id) => id === 'request-b')).toHaveLength(2);
    expect(logs.map((entry) => entry.operation_id).sort()).toEqual(['request-a', 'request-b']);
  });

  it('B1#32: runNow preserves operation_id outside HTTP', async () => {
    const { dispatcher, mailer, logs } = setup();
    mailer.failNext();
    runWithOperationId('cli-operation', () => dispatcher.runNow([sendPrepared(message)]));
    await dispatcher.drain();
    expect(logs[0].operation_id).toBe('cli-operation');
  });

  it('B1#38: empty batches and an idle drain settle immediately', async () => {
    const { dispatcher, res } = setup();
    dispatcher.afterResponse(res, []);
    dispatcher.runNow([]);
    await expect(dispatcher.drain()).resolves.toBeUndefined();
    expect(res.listenerCount('close')).toBe(0);
  });
});
