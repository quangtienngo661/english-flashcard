import type { ArgumentsHost } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from './problem-details.exception.js';
import { ProblemDetailsFilter } from './problem-details.filter.js';

function mockArgumentsHost(requestExtras: Record<string, unknown>) {
  const response = {
    statusCode: 0,
    contentType: '',
    body: undefined as unknown,
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
