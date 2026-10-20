// Responses shaped from OpenAI's docs (Responses API object, error-codes guide), one per row of design §4.3 table 1.
// Test data only: no real call reaches OpenAI (D19).

export type Fixture = { name: string; status: number; headers: Record<string, string>; body: unknown };

const JSON_HEADERS = { 'content-type': 'application/json', 'x-request-id': 'req_openai_1' };

export function errorFixture(
  name: string, status: number, error: { message: string; type: string; param?: string | null; code?: string | null },
  headers: Record<string, string> = {},
): Fixture {
  return {
    name, status, headers: { ...JSON_HEADERS, ...headers },
    body: { error: { param: null, code: null, ...error } },
  };
}

type Content = { type: 'output_text'; text: string; annotations: [] } | { type: 'refusal'; refusal: string };

export function responseFixture(
  name: string,
  over: {
    status?: string;
    incomplete?: string | null;
    content?: Content[] | null;
    usage?: Record<string, unknown> | null;
  } = {},
): Fixture {
  const content = over.content === undefined ? [textPart('{"translation_vi":"Xin chào."}')] : over.content;
  const usage = over.usage === undefined ? USAGE : over.usage;
  return {
    name,
    status: 200,
    headers: JSON_HEADERS,
    body: {
      id: 'resp_1',
      object: 'response',
      created_at: 1_760_000_000,
      model: 'gpt-test',
      status: over.status ?? 'completed',
      incomplete_details: over.incomplete ? { reason: over.incomplete } : null,
      output: content === null ? [] : [{ type: 'message', id: 'msg_1', role: 'assistant', status: 'completed', content }],
      ...(usage === null ? {} : { usage }),
    },
  };
}

export function textPart(text: string): Content {
  return { type: 'output_text', text, annotations: [] };
}

export const USAGE = {
  input_tokens: 120,
  input_tokens_details: { cached_tokens: 20 },
  output_tokens: 60,
  output_tokens_details: { reasoning_tokens: 10 },
  total_tokens: 180,
};

export const QUOTA_CODES = [
  'credit_balance_exhausted', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded',
  'organization_usage_limit_exceeded',
] as const;

export const RATE_LIMIT = { message: 'Rate limit reached for requests', type: 'requests', code: 'rate_limit_exceeded' };

/** ASSUMPTION: the error-codes guide has no 404 row; shaped like the other rows. */
export const MODEL_NOT_FOUND = {
  message: 'The model `gpt-nope` does not exist or you do not have access to it.', type: 'invalid_request_error',
  code: 'model_not_found',
};

export const MODEL_OBJECT = { id: 'gpt-test', object: 'model', created: 1_760_000_000, owned_by: 'openai' };
