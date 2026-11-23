import { APIError, NotFoundError } from '@payos/node';
import { describe, expect, it } from 'vitest';
import { isPayosNotFound } from './payos-errors.js';

const sdkError = (status: number, code: string, desc: string) =>
  APIError.generateError(status, { data: null, code, desc, signature: null }, desc, new Headers());

describe('isPayosNotFound (PAY-01, PAY-02)', () => {
  it('returns true for HTTP 404 NotFoundError', () => {
    expect(isPayosNotFound(new NotFoundError(404, { code: '101', desc: 'not found' }, 'not found', new Headers()))).toBe(true);
  });

  it('returns true for HTTP 200 APIError with payOS code 101', () => {
    const err = sdkError(200, '101', 'Mã thanh toán không tồn tại');
    expect(err).toBeInstanceOf(APIError);
    expect(err).not.toBeInstanceOf(NotFoundError);
    expect(isPayosNotFound(err)).toBe(true);
  });

  it('returns false for HTTP 200 APIError with another payOS code', () => {
    expect(isPayosNotFound(sdkError(200, '20', 'other error'))).toBe(false);
  });

  it('returns false for a plain Error or null', () => {
    expect(isPayosNotFound(new Error('x'))).toBe(false);
    expect(isPayosNotFound(null)).toBe(false);
  });
});
