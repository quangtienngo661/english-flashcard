import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

export interface IdempotentOptions {
  /**
   * Default 30s. A lease, not a timeout: a retry with the same key gets 409 "still running" until it has passed, then 409 `idempotency-key-abandoned`.
   * It never stops the handler; a handler that runs past it still records its result.
   */
  timeoutSeconds?: number;
}

export const Idempotent = (options?: IdempotentOptions) =>
  SetMetadata(IDEMPOTENT_KEY, { timeoutSeconds: options?.timeoutSeconds ?? 30 });
