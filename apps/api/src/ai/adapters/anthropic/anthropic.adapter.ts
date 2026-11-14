import Anthropic from '@anthropic-ai/sdk';
import { AI_DESCRIBE_TIMEOUT_MS } from '../../ai.constants.js';
import {
  AiAdapter, type AdapterOutcome, type AdapterRequest, type ModelDescription, type ModelInfo, type Usage,
} from '../ai-adapter.js';
import { mapAnthropicError } from './anthropic-errors.js';
import { buildAnthropicRequest } from './anthropic-request.js';

/**
 * The only place an Anthropic client is built. Every option the SDK would otherwise read from the environment
 * (`ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_WEBHOOK_SIGNING_KEY`, `ANTHROPIC_LOG`, the `ANTHROPIC_OPEN_TELEMETRY*`
 * variables) is given, so no variable can redirect a request, add a credential or log or trace a body (plan review #6; the
 * shell of Claude Code sessions on this machine sets `ANTHROPIC_BASE_URL`). With `apiKey` given the SDK never reads a
 * profile or credential file. No SDK retry: the runner owns retries.
 */
export function anthropicClient(apiKey: string, fetchImpl?: typeof fetch): Anthropic {
  return new Anthropic({
    apiKey,
    authToken: null,
    webhookKey: null,
    baseURL: 'https://api.anthropic.com',
    logLevel: 'warn',
    openTelemetry: false,
    maxRetries: 0,
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });
}

function usageOf(usage: Anthropic.Messages.Usage): Usage {
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  return {
    inputTokens: usage.input_tokens + cacheRead + (usage.cache_creation_input_tokens ?? 0),
    cachedInputTokens: cacheRead,
    outputTokens: usage.output_tokens,
    reasoningTokens: usage.output_tokens_details?.thinking_tokens ?? 0,
  };
}

/** Design §4.3: the `text` blocks joined (thinking blocks ignored), untouched; the gate parses them (plan choice 1). */
export function mapAnthropicResponse(res: Anthropic.Messages.Message & { _request_id?: string | null }): AdapterOutcome {
  const text = res.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
  const common = { text, usage: res.usage ? usageOf(res.usage) : null, providerRequestId: res._request_id ?? null };
  switch (res.stop_reason) {
    case 'end_turn':
      return { kind: 'ok', ...common };
    case 'max_tokens':
    case 'model_context_window_exceeded':
      return { kind: 'truncated', ...common };
    case 'refusal':
      return { kind: 'refused', ...common };
    default:
      return { kind: 'stopped', detail: res.stop_reason ?? 'unknown', ...common };
  }
}

const EFFORT_ORDER = ['low', 'medium', 'high', 'xhigh', 'max'] as const;

function modelInfo(model: Anthropic.Models.ModelInfo): ModelInfo {
  const caps = model.capabilities;
  const retires = model.retires_at ? new Date(model.retires_at) : null;
  const common = {
    shutdownAt: retires && !Number.isNaN(retires.getTime()) ? retires : null,
    lifecycle: model.lifecycle ?? null,
    maxOutputTokens: model.max_tokens ?? null,
  };
  if (!caps) return { ...common, effortLevels: [], thinkingOff: null, structuredOutputs: null };
  const types = caps.thinking.types;
  return {
    ...common,
    effortLevels: caps.effort.supported ? EFFORT_ORDER.filter((level) => caps.effort[level]?.supported === true) : [],
    thinkingOff: types.disabled.supported ? 'disabled' : types.between_tools.supported ? 'between_tools' : null,
    structuredOutputs: caps.structured_outputs.supported,
  };
}

export class AnthropicAdapter extends AiAdapter {
  readonly provider = 'anthropic';

  constructor(private readonly client: Anthropic) {
    super();
  }

  async call(req: AdapterRequest, signal: AbortSignal): Promise<AdapterOutcome> {
    const maxOutputTokens = req.maxOutputTokens;
    if (maxOutputTokens === null) {
      // The runner always resolves a number for Anthropic (D28); this only guards a caller bug.
      return {
        kind: 'error', error: 'model_rejected', httpStatus: null, providerErrorCode: 'max-tokens-unknown', retryAfterMs: null,
        providerRequestId: null,
      };
    }
    try {
      const res = await this.client.messages.create(
        buildAnthropicRequest({ ...req, maxOutputTokens }), { timeout: req.timeoutMs, signal, maxRetries: 0 },
      );
      return mapAnthropicResponse(res);
    } catch (err) {
      return mapAnthropicError(err);
    }
  }

  async describeModel(modelId: string, signal: AbortSignal): Promise<ModelDescription> {
    try {
      // Request options are the third argument (plan review #5).
      const model = await this.client.models.retrieve(modelId, {}, { timeout: AI_DESCRIBE_TIMEOUT_MS, signal, maxRetries: 0 });
      return { kind: 'found', info: modelInfo(model) };
    } catch (err) {
      const status = err instanceof Anthropic.APIError ? err.status : undefined;
      if (status === 404) return { kind: 'not-found' };
      if (status === 401) return { kind: 'not-configured' };
      return { kind: 'unavailable' };
    }
  }
}
