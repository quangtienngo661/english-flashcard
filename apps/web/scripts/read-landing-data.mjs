// Giao diện mới M8.3 (design §10.6, §10.7): the landing's prices and FAQ are read once, at `next build` (next.config.ts), and inlined as
// process.env.WORDMET_LANDING_DATA. The home page never reads them per request, so /vi and /en stay prerendered (assert:render-mode).
// No API (CI, cf:docker, a dev machine with the API stopped): one warning, and the page uses S/landing/landing-data.fallback.ts.

const MONTHS = ['1', '3', '12'];

/** @param {unknown} body @returns {Record<'1' | '3' | '12', number> | null} */
function pricesOf(body) {
  const prices = body && typeof body === 'object' ? /** @type {{ prices?: unknown }} */ (body).prices : undefined;
  if (!prices || typeof prices !== 'object') return null;
  const out = {};
  for (const months of MONTHS) {
    const value = /** @type {Record<string, unknown>} */ (prices)[months];
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
    out[months] = value;
  }
  return /** @type {Record<'1' | '3' | '12', number>} */ (out);
}

/** @param {unknown} body @returns {{ question: string; answer: string }[] | null} */
function faqOf(body) {
  const items = body && typeof body === 'object' ? /** @type {{ items?: unknown }} */ (body).items : undefined;
  if (!Array.isArray(items)) return null;
  const out = [];
  for (const item of items) {
    if (!item || typeof item !== 'object' || typeof item.question !== 'string' || typeof item.answer !== 'string') return null;
    out.push({ question: item.question, answer: item.answer });
  }
  return out;
}

class Unavailable extends Error {
  /** @param {string} url @param {string} reason */
  constructor(url, reason) {
    super(reason);
    this.url = url;
  }
}

/** @param {typeof fetch} fetchImpl @param {string} url @param {number} timeoutMs @param {(body: unknown) => unknown} shape */
async function read(fetchImpl, url, timeoutMs, shape) {
  let response;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' } });
  } catch (error) {
    const reason = error instanceof Error && error.name === 'TimeoutError' ? `no answer within ${timeoutMs} ms` : error instanceof Error ? error.message : String(error);
    throw new Unavailable(url, reason);
  }
  if (!response.ok) throw new Unavailable(url, `HTTP ${response.status}`);
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Unavailable(url, 'the body is not JSON');
  }
  const value = shape(body);
  if (value === null) throw new Unavailable(url, 'unexpected shape');
  return value;
}

/**
 * @param {{ baseUrl: string; required: boolean; offline: boolean; timeoutMs?: number; fetchImpl?: typeof fetch }} options
 * @returns {Promise<string | undefined>} `JSON.stringify({ prices, faq })`, or undefined when the API cannot give both.
 */
export async function readLandingData({ baseUrl, required, offline, timeoutMs = 5000, fetchImpl = fetch }) {
  if (offline) return undefined;
  const base = baseUrl.replace(/\/+$/, '');
  try {
    const [prices, faq] = await Promise.all([
      read(fetchImpl, `${base}/v1/public/prices`, timeoutMs, pricesOf),
      read(fetchImpl, `${base}/v1/public/faq`, timeoutMs, faqOf),
    ]);
    return JSON.stringify({ prices, faq });
  } catch (error) {
    const url = error instanceof Unavailable ? error.url : base;
    const reason = error instanceof Error ? error.message : String(error);
    if (required) throw new Error(`Landing data required but unavailable: ${url} (${reason})`);
    console.warn(`[landing-data] ${url} unavailable (${reason}); the landing uses the fallback prices and FAQ.`);
    return undefined;
  }
}

/** Where the first read is kept: `next build` evaluates next.config.ts again in its compile worker, which inherits the environment. */
const MEMO = 'WORDMET_LANDING_DATA_READ';

/**
 * `readLandingData` once per build: the result ('' for "none") is stored in `env`, and a later call with that environment reuses it, so the
 * API is read and the warning printed only once.
 * @param {Record<string, string | undefined>} env @param {Parameters<typeof readLandingData>[0]} options
 */
export async function readLandingDataOnce(env, options) {
  const stored = env[MEMO];
  if (stored !== undefined) return stored === '' ? undefined : stored;
  const data = await readLandingData(options);
  env[MEMO] = data ?? '';
  return data;
}
