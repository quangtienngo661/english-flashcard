// Responses shaped from Anthropic's docs (Messages API, errors page, rate-limits page read 20/10/2026), one per row of design
// §4.3 table 2. Test data only: no real call reaches Anthropic (D19).

export type Fixture = { name: string; status: number; headers: Record<string, string>; body: unknown };

const JSON_HEADERS = { 'content-type': 'application/json', 'request-id': 'req_anthropic_1' };

export function errorFixture(
  name: string, status: number, error: { type: string; message: string; details?: Record<string, unknown> },
  headers: Record<string, string> = {},
): Fixture {
  return {
    name, status, headers: { ...JSON_HEADERS, ...headers },
    body: { type: 'error', error, request_id: 'req_anthropic_1' },
  };
}

/** Owner-set spend limits: 400 `invalid_request_error`; the message begins with these words (plan choice 4). */
export const SPEND_LIMIT_MESSAGE =
  'You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC.';
export const WORKSPACE_SPEND_LIMIT_MESSAGE =
  'You have reached your specified workspace API usage limits. You will regain access on 2026-11-01 at 00:00 UTC.';

/** The tier spend cap: 429 `rate_limit_error` with `details.error_code`, no `retry-after`. */
export const SPEND_CAP = {
  type: 'rate_limit_error',
  message: "You've reached your organization's monthly spend limit.",
  details: { error_code: 'enforced_spend_limit_reached' },
};

export const RATE_LIMIT = { type: 'rate_limit_error', message: 'Number of request tokens has exceeded your per-minute rate limit' };

type Block = { type: 'text'; text: string; citations: null } | { type: 'thinking'; thinking: string; signature: string };

export function textBlock(text: string): Block {
  return { type: 'text', text, citations: null };
}

export const THINKING_BLOCK: Block = { type: 'thinking', thinking: 'Let me think.', signature: 'sig' };

export function messageFixture(
  name: string, over: { stopReason?: string; content?: Block[]; usage?: Record<string, unknown> } = {},
): Fixture {
  return {
    name,
    status: 200,
    headers: JSON_HEADERS,
    body: {
      id: 'msg_1',
      type: 'message',
      role: 'assistant',
      model: 'claude-test',
      content: over.content ?? [textBlock('{"translation_vi":"Xin chào."}')],
      stop_reason: over.stopReason ?? 'end_turn',
      stop_sequence: null,
      usage: over.usage ?? USAGE,
    },
  };
}

export const USAGE = {
  input_tokens: 100,
  cache_read_input_tokens: 30,
  cache_creation_input_tokens: 20,
  output_tokens: 60,
  output_tokens_details: { thinking_tokens: 15 },
};

const yes = { supported: true };
const no = { supported: false };

export function modelFixture(over: { capabilities?: unknown; maxTokens?: number | null } = {}): Fixture {
  return {
    name: 'model',
    status: 200,
    headers: JSON_HEADERS,
    body: {
      id: 'claude-test',
      type: 'model',
      display_name: 'Claude Test',
      created_at: '2026-01-01T00:00:00Z',
      deprecated_at: null,
      lifecycle: 'active',
      retires_at: '2027-03-01T00:00:00Z',
      max_input_tokens: 200_000,
      max_tokens: over.maxTokens === undefined ? 64_000 : over.maxTokens,
      capabilities: over.capabilities === undefined ? capabilities() : over.capabilities,
    },
  };
}

export function capabilities(over: {
  effort?: Record<string, unknown>; disabled?: boolean; betweenTools?: boolean; structuredOutputs?: boolean;
} = {}) {
  return {
    batch: yes, citations: yes, code_execution: no, image_input: yes, pdf_input: yes,
    context_management: { supported: false },
    server_tools: { supported: false },
    effort: over.effort ?? { supported: true, low: yes, medium: yes, high: yes, xhigh: null, max: yes },
    structured_outputs: { supported: over.structuredOutputs ?? true },
    thinking: {
      supported: true,
      types: {
        adaptive: yes, enabled: yes, disabled: { supported: over.disabled ?? true }, between_tools: { supported: over.betweenTools ?? false },
      },
    },
  };
}
