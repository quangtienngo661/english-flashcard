import OpenAI from 'openai';
import { AI_DESCRIBE_TIMEOUT_MS } from '../../ai.constants.js';
import { AiAdapter, type AdapterOutcome, type AdapterRequest, type ModelDescription, type Usage } from '../ai-adapter.js';
import { mapOpenAiError } from './openai-errors.js';
import { buildOpenAiRequest } from './openai-request.js';

/**
 * The only place an OpenAI client is built. Every option the SDK would otherwise read from the environment (`OPENAI_BASE_URL`,
 * `OPENAI_ORG_ID`, `OPENAI_PROJECT_ID`, `OPENAI_ADMIN_KEY`, `OPENAI_WEBHOOK_SECRET`, `OPENAI_LOG`) is given, so no variable
 * can redirect a request or log a body (plan review #6). No SDK retry: the runner owns retries.
 */
export function openAiClient(apiKey: string, fetchImpl?: typeof fetch): OpenAI {
  return new OpenAI({
    apiKey,
    adminAPIKey: null,
    webhookSecret: null,
    baseURL: 'https://api.openai.com/v1',
    organization: null,
    project: null,
    logLevel: 'warn',
    maxRetries: 0,
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });
}

function usageOf(res: OpenAI.Responses.Response): Usage | null {
  if (!res.usage) return null;
  return {
    inputTokens: res.usage.input_tokens,
    cachedInputTokens: res.usage.input_tokens_details?.cached_tokens ?? 0,
    outputTokens: res.usage.output_tokens,
    reasoningTokens: res.usage.output_tokens_details?.reasoning_tokens ?? 0,
  };
}

function hasRefusal(res: OpenAI.Responses.Response): boolean {
  return res.output.some((item) => item.type === 'message' && item.content.some((part) => part.type === 'refusal'));
}

/** Design §4.3: the text is returned untouched; the gate parses it (plan choice 1). */
export function mapOpenAiResponse(res: OpenAI.Responses.Response & { _request_id?: string | null }): AdapterOutcome {
  const common = { text: res.output_text ?? '', usage: usageOf(res), providerRequestId: res._request_id ?? null };
  if (res.status === 'completed') return { kind: hasRefusal(res) ? 'refused' : 'ok', ...common };
  if (res.status === 'incomplete') {
    const reason = res.incomplete_details?.reason ?? 'unknown';
    if (reason === 'max_output_tokens') return { kind: 'truncated', ...common };
    if (reason === 'content_filter') return { kind: 'refused', ...common };
    return { kind: 'stopped', detail: reason, ...common };
  }
  return { kind: 'stopped', detail: res.status ?? 'unknown', ...common };
}

function shutdownAt(model: OpenAI.Models.Model): Date | null {
  if (!model.shutdown_date) return null;
  const at = new Date(model.shutdown_date);
  return Number.isNaN(at.getTime()) ? null : at;
}

export class OpenAiAdapter extends AiAdapter {
  readonly provider = 'openai';

  constructor(private readonly client: OpenAI) {
    super();
  }

  async call(req: AdapterRequest, signal: AbortSignal): Promise<AdapterOutcome> {
    try {
      const res = await this.client.responses.create(buildOpenAiRequest(req), { timeout: req.timeoutMs, signal, maxRetries: 0 });
      return mapOpenAiResponse(res);
    } catch (err) {
      return mapOpenAiError(err);
    }
  }

  async describeModel(modelId: string, signal: AbortSignal): Promise<ModelDescription> {
    try {
      const model = await this.client.models.retrieve(modelId, { timeout: AI_DESCRIBE_TIMEOUT_MS, signal, maxRetries: 0 });
      return {
        kind: 'found',
        info: {
          shutdownAt: shutdownAt(model), lifecycle: null, effortLevels: [], thinkingOff: null, structuredOutputs: null,
          maxOutputTokens: null,
        },
      };
    } catch (err) {
      const status = err instanceof OpenAI.APIError ? err.status : undefined;
      if (status === 404) return { kind: 'not-found' };
      if (status === 401) return { kind: 'not-configured' };
      return { kind: 'unavailable' };
    }
  }
}
