import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'idempotent';

export interface IdempotentOptions {
  /** Default 30s. Different handlers (a trivial write vs. an AI provider call) may need different bounds. */
  timeoutSeconds?: number;
}

export const Idempotent = (options?: IdempotentOptions) =>
  SetMetadata(IDEMPOTENT_KEY, { timeoutSeconds: options?.timeoutSeconds ?? 30 });
