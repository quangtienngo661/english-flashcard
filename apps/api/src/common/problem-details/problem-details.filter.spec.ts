import { BadRequestException, HttpException, NotFoundException, StandardSchemaValidationPipe, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppLogger, type LogEntry } from '../logging/app-logger.js';
import { runWithOperationId } from '../logging/request-context.js';
import { ProblemDetailsException } from './problem-details.exception.js';
import { ProblemDetailsFilter } from './problem-details.filter.js';

function mockArgumentsHost(requestExtras: Record<string, unknown>) {
  const response = {
    statusCode: 0,
    contentType: '',
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    type(contentType: string) {
      this.contentType = contentType;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  const request = { url: '/v1/test', ...requestExtras };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('ProblemDetailsFilter', () => {
  it('renders base + slug, extensions and Retry-After', () => {
    const { host, response } = mockArgumentsHost({ operationId: 'op-2' });
    new ProblemDetailsFilter('https://api.example.com/problems/').catch(
      new ProblemDetailsException({
        status: 429, title: 'Too many requests', type: 'rate-limited',
        extensions: { violations: ['cooldown'] }, retryAfterSeconds: 60,
      }), host,
    );
    expect(response.body).toMatchObject({
      status: 429, type: 'https://api.example.com/problems/rate-limited',
      violations: ['cooldown'], operation_id: 'op-2', instance: '/v1/test',
    });
    expect(response.headers['Retry-After']).toBe('60');
  });

  it('B1#36: maps entity.too.large to 413 payload-too-large', () => {
    const { host, response } = mockArgumentsHost({ operationId: 'op-2' });
    new ProblemDetailsFilter('https://api.example.com/problems/').catch(
      Object.assign(new Error('private request body'), { type: 'entity.too.large', status: 413, expose: true }), host,
    );
    expect(response.contentType).toBe('application/problem+json');
    expect(response.body).toMatchObject({
      status: 413, type: 'https://api.example.com/problems/payload-too-large', operation_id: 'op-2',
    });
    expect(JSON.stringify(response.body)).not.toContain('private request body');
  });

  it('maps entity.parse.failed to 400 validation-failed', () => {
    const { host, response } = mockArgumentsHost({ operationId: 'op-2' });
    new ProblemDetailsFilter('https://api.example.com/problems/').catch(
      Object.assign(new SyntaxError('private JSON'), { type: 'entity.parse.failed', status: 400, expose: true }), host,
    );
    expect(response.body).toMatchObject({
      status: 400, type: 'https://api.example.com/problems/validation-failed', operation_id: 'op-2',
    });
    expect(JSON.stringify(response.body)).not.toContain('private JSON');
  });

  // @nestjs/platform-express 12.3.0 wraps body-parser's http-errors in an HttpException (the original is its `cause`)
  // before any filter runs; 12.1.2 passed them through. The wrapped error must map exactly as the bare one does.
  const bodyError = (message: string, type: string, status: number) =>
    Object.assign(new Error(message), { type, status, statusCode: status, expose: true });
  const wrapped = (cause: Error & { status: number }) => new HttpException(cause.message, cause.status, { cause });

  it('B1#36: a wrapped entity.too.large is still 413 payload-too-large and does not echo its message', () => {
    const { host, response } = mockArgumentsHost({ operationId: 'op-3' });
    new ProblemDetailsFilter('https://api.example.com/problems/').catch(
      wrapped(bodyError('private request body', 'entity.too.large', 413)), host,
    );
    expect(response.statusCode).toBe(413);
    expect(response.body).toMatchObject({
      status: 413, type: 'https://api.example.com/problems/payload-too-large', title: 'Payload too large', operation_id: 'op-3',
    });
    expect(JSON.stringify(response.body)).not.toContain('private request body');
  });

  it('a wrapped charset.unsupported is 415 unsupported-media-type', () => {
    const { host, response } = mockArgumentsHost({});
    new ProblemDetailsFilter('https://api.example.com/problems/').catch(
      wrapped(bodyError('unsupported charset "LATIN1"', 'charset.unsupported', 415)), host,
    );
    expect(response.statusCode).toBe(415);
    expect(response.body).toMatchObject({
      status: 415, type: 'https://api.example.com/problems/unsupported-media-type', title: 'Unsupported media type',
    });
  });

  it('a wrapped 400 body error is validation-failed and carries no violations echoing its message', () => {
    const { host, response } = mockArgumentsHost({});
    new ProblemDetailsFilter('https://api.example.com/problems/').catch(
      wrapped(bodyError('private size detail', 'request.size.invalid', 400)), host,
    );
    expect(response.statusCode).toBe(400);
    expect(response.body).toMatchObject({ status: 400, type: 'https://api.example.com/problems/validation-failed' });
    expect(response.body).not.toHaveProperty('violations');
    expect(JSON.stringify(response.body)).not.toContain('private size detail');
  });

  it('maps a StandardSchemaValidationPipe 400 to validation-failed with violations', async () => {
    const pipe = new StandardSchemaValidationPipe();
    const { host, response } = mockArgumentsHost({});
    let exception: unknown;
    try {
      await pipe.transform({ email: 42 }, { type: 'body', schema: z.strictObject({ email: z.string() }) });
    } catch (err) {
      exception = err;
    }
    expect(exception).toBeInstanceOf(BadRequestException);
    new ProblemDetailsFilter('https://api.example.com/problems/').catch(exception, host);
    expect(response.body).toMatchObject({
      status: 400, type: 'https://api.example.com/problems/validation-failed',
      violations: ((exception as BadRequestException).getResponse() as { message: string[] }).message,
    });
  });

  it('maps a string 400 message to a violations array and uses about:blank without a base', () => {
    const { host, response } = mockArgumentsHost({});
    new ProblemDetailsFilter().catch(new BadRequestException('invalid input'), host);
    expect(response.body).toMatchObject({ status: 400, type: 'about:blank', violations: ['invalid input'] });
  });

  it('formats any thrown error as application/problem+json with operation_id', () => {
    const { host, response } = mockArgumentsHost({ operationId: 'op-2' });
    new ProblemDetailsFilter().catch(
      new ProblemDetailsException({ status: 409, title: 'Conflict' }),
      host,
    );
    expect(response.contentType).toBe('application/problem+json');
    expect(response.body).toMatchObject({ status: 409, title: 'Conflict', operation_id: 'op-2' });
  });

  describe('C3: logging 5xx', () => {
    const frames = (n: number) => Array.from({ length: n }, (_, i) => `    at fn${i} (file:///src/mod${i}.ts:${i}:1)`);

    function setup(requestExtras: Record<string, unknown> = {}) {
      const entries: LogEntry[] = [];
      const logger = new AppLogger({ write: (entry) => entries.push(entry) });
      const filter = new ProblemDetailsFilter('https://api.example.com/problems/', logger);
      return { entries, filter, ...mockArgumentsHost({ method: 'POST', route: { path: '/v1/groups/:id' }, ...requestExtras }) };
    }

    it('C3/FE34: a 500 logs request_failed with operation_id, method, route pattern, error name and Prisma code, ≤ 10 stack lines, no message', () => {
      const { entries, filter, host, response } = setup({ url: '/v1/groups/9f1c?email=secret@example.com' });
      const exception = Object.assign(new Error('value secret@example.com'), { code: 'P2002' });
      exception.stack = `Error: value secret@example.com\n${frames(25).join('\n')}`;
      runWithOperationId('op-1', () => filter.catch(exception, host));

      expect(entries).toHaveLength(1);
      const [entry] = entries;
      expect(entry).toMatchObject({
        level: 'error', event: 'request_failed', operation_id: 'op-1', method: 'POST',
        route: '/v1/groups/:id', error: { name: 'Error', code: 'P2002' },
      });
      expect(entry.stack).toHaveLength(10);
      expect(entry.stack).toEqual(frames(10).map((line) => line.trim()));
      expect(JSON.stringify(entry)).not.toContain('secret@example.com');
      expect(JSON.stringify(entry)).not.toContain('9f1c');
      // the response itself is unchanged
      expect(response.statusCode).toBe(500);
      expect(response.body).toMatchObject({ status: 500, title: 'Internal Server Error', type: 'about:blank' });
    });

    it('C3: a message spanning several lines (Prisma errors do) does not leak through the stack', () => {
      const { entries, filter, host } = setup();
      const exception = new Error('Invalid invocation\nUnique constraint failed = secret@example.com\n  at user.create');
      exception.stack = `Error: Invalid invocation\nUnique constraint failed = secret@example.com\n${frames(3).join('\n')}`;
      runWithOperationId('op-1', () => filter.catch(exception, host));
      expect(entries[0].stack).toEqual(frames(3).map((line) => line.trim()));
      expect(JSON.stringify(entries[0])).not.toContain('secret@example.com');
    });

    it('C3: without a matched route the log says unmatched, never the url', () => {
      const { entries, filter, host } = setup({ route: undefined, url: '/v1/nope/0f8fad5b-d9cb-469f-a165-70867728950e' });
      runWithOperationId('op-1', () => filter.catch(new Error('boom'), host));
      expect(entries[0]).toMatchObject({ event: 'request_failed', route: 'unmatched' });
      expect(JSON.stringify(entries[0])).not.toContain('0f8fad5b');
    });

    it('C3: a thrown value with no stack logs an empty stack and the generic error name', () => {
      const { entries, filter, host, response } = setup();
      runWithOperationId('op-1', () => filter.catch('plain string', host));
      expect(entries[0]).toMatchObject({ event: 'request_failed', error: { name: 'UnknownError' }, stack: [] });
      expect(response.statusCode).toBe(500);
    });

    it('C3: any mapped 5xx is logged, not only unknown errors', () => {
      const { entries, filter, host } = setup();
      runWithOperationId('op-1', () => filter.catch(
        new ProblemDetailsException({ status: 503, title: 'Service unavailable' }), host,
      ));
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ event: 'request_failed', route: '/v1/groups/:id' });
    });

    it('C3: a 4xx (validation, 404, 409) logs nothing', () => {
      const { entries, filter, host } = setup();
      runWithOperationId('op-1', () => {
        filter.catch(new BadRequestException('invalid input'), host);
        filter.catch(new NotFoundException(), host);
        filter.catch(new ProblemDetailsException({ status: 409, title: 'Conflict' }), host);
        filter.catch(Object.assign(new Error('x'), { status: 413, expose: true }), host);
      });
      expect(entries).toEqual([]);
    });

    it('C3: a 500 without a logger still renders the problem body', () => {
      const { host, response } = mockArgumentsHost({ operationId: 'op-2' });
      new ProblemDetailsFilter().catch(new Error('boom'), host);
      expect(response.body).toMatchObject({ status: 500, operation_id: 'op-2' });
    });
  });
});
