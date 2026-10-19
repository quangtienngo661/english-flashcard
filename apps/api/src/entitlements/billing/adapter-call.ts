import { BILLING_ADAPTER_TIMEOUT_MS } from '../entitlements.constants.js';

/**
 * Runs one adapter call bounded by `BILLING_ADAPTER_TIMEOUT_MS`. A throw or a timeout is a result, never a throw: callers
 * treat it as "not supported" / "fetch failed" (plan Global Constraints, R6).
 */
export async function callAdapter<T>(call: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('billing adapter timeout')), BILLING_ADAPTER_TIMEOUT_MS);
  });
  try {
    return { ok: true, value: await Promise.race([call(), timeout]) };
  } catch (error) {
    return { ok: false, error };
  } finally {
    clearTimeout(timer);
  }
}
