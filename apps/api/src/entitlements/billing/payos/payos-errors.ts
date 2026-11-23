import { APIError, NotFoundError } from '@payos/node';

/**
 * True when payOS reports that a payment link / order code does not exist (PAY-01, PAY-02).
 * payOS sends HTTP 200 with `{ code: '101', desc: 'Mã thanh toán không tồn tại' }`, which
 * `@payos/node` 2.0.5 surfaces as a plain `APIError` rather than `NotFoundError`.
 */
export function isPayosNotFound(error: unknown): boolean {
  if (error instanceof NotFoundError) return true;
  if (!(error instanceof APIError)) return false;
  const bodyCode = typeof error.error === 'object' && error.error !== null && 'code' in error.error
    ? (error.error as { code?: unknown }).code
    : undefined;
  const code = error.code ?? bodyCode;
  return code === '101' || code === 101;
}
