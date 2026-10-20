import type { AiProviderName } from '../ai.types.js';

/** What the runner hands an adapter (design §4.3). `timeoutMs` is an integer ≥ 1 (Global Constraints "Time"). */
export type AdapterRequest = {
  model: string;
  instructions: string;
  data: unknown;
  schema: { name: string; schema: Record<string, unknown> };
  effort: string | null;
  thinking: 'disabled' | 'between_tools' | null;
  maxOutputTokens: number | null;
  timeoutMs: number;
};

/** `inputTokens` includes cached ones; `outputTokens` includes reasoning. */
export type Usage = { inputTokens: number; cachedInputTokens: number; outputTokens: number; reasoningTokens: number };

export type AdapterError = 'timeout' | 'connection' | 'rate_limited' | 'server' | 'auth' | 'model_rejected' | 'provider_quota';

/** The provider's text, untouched: the gate parses it (plan choice 1). */
export type AdapterOutcome =
  | { kind: 'ok'; text: string; usage: Usage | null; providerRequestId: string | null }
  | { kind: 'refused' | 'truncated'; text: string | null; usage: Usage | null; providerRequestId: string | null }
  | { kind: 'stopped'; detail: string; text: string | null; usage: Usage | null; providerRequestId: string | null }
  | {
      kind: 'error';
      error: AdapterError;
      httpStatus: number | null;
      providerErrorCode: string | null;
      retryAfterMs: number | null;
      providerRequestId: string | null;
    };

/** `effortLevels` `[]` = none known (plan choice 9). */
export type ModelInfo = {
  shutdownAt: Date | null;
  lifecycle: 'active' | 'deprecated' | 'retired' | null;
  effortLevels: string[];
  thinkingOff: 'disabled' | 'between_tools' | null;
  structuredOutputs: boolean | null;
  maxOutputTokens: number | null;
};

export type ModelDescription =
  | { kind: 'found'; info: ModelInfo }
  | { kind: 'not-found' }
  | { kind: 'not-configured' }
  | { kind: 'unavailable' };

/**
 * One provider (design §4.3). Neither method throws: every failure is an outcome. No retry, no logging of content, no
 * database — the runner owns all three.
 */
export abstract class AiAdapter {
  abstract readonly provider: AiProviderName;
  abstract call(req: AdapterRequest, signal: AbortSignal): Promise<AdapterOutcome>;
  abstract describeModel(modelId: string, signal: AbortSignal): Promise<ModelDescription>;
}
