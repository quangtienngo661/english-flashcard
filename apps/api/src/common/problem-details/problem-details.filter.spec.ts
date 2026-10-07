import { BadRequestException, StandardSchemaValidationPipe, type ArgumentsHost } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
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
});
