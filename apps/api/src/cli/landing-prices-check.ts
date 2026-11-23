import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type PlanMonths = 1 | 3 | 12;
export type PriceMap = Record<PlanMonths, number>;
export type PriceDiff = { months: PlanMonths; landing: number; live: number };

const MONTHS: readonly PlanMonths[] = [1, 3, 12];
const TIMEOUT_MS = 10_000;
const SCRIPT_RE = /<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function collectPaidOffers(node: unknown): number[] {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = collectPaidOffers(item);
      if (found.length >= 3) return found;
    }
    return [];
  }
  if (!node || typeof node !== 'object') return [];
  const rec = node as Record<string, unknown>;
  if (Array.isArray(rec.offers)) {
    const paid: number[] = [];
    for (const offer of rec.offers) {
      if (!offer || typeof offer !== 'object') continue;
      const raw = (offer as Record<string, unknown>).price;
      const price = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
      if (Number.isFinite(price) && price > 0) paid.push(price);
    }
    if (paid.length >= 3) return paid;
  }
  if (Array.isArray(rec['@graph'])) return collectPaidOffers(rec['@graph']);
  return [];
}

/** Reads `<script type="application/ld+json">` blocks and extracts the first 3 paid offers (1, 3, 12 months). */
export function extractJsonLdPrices(html: string): PriceMap | null {
  SCRIPT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SCRIPT_RE.exec(html)) !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }
    const paid = collectPaidOffers(parsed);
    if (paid.length >= 3) {
      return { 1: paid[0], 3: paid[1], 12: paid[2] };
    }
  }
  return null;
}

export function comparePrices(landing: PriceMap, live: PriceMap): PriceDiff[] {
  const diffs: PriceDiff[] = [];
  for (const months of MONTHS) {
    if (landing[months] !== live[months]) {
      diffs.push({ months, landing: landing[months], live: live[months] });
    }
  }
  return diffs;
}

function parseLivePrices(body: unknown): PriceMap | null {
  if (!body || typeof body !== 'object') return null;
  const prices = (body as Record<string, unknown>).prices;
  if (!prices || typeof prices !== 'object') return null;
  const rec = prices as Record<string, unknown>;
  const p1 = Number(rec['1']);
  const p3 = Number(rec['3']);
  const p12 = Number(rec['12']);
  if (!Number.isFinite(p1) || !Number.isFinite(p3) || !Number.isFinite(p12)) return null;
  return { 1: p1, 3: p3, 12: p12 };
}

export async function runLandingPricesCheck(options?: {
  fetchImpl?: typeof fetch;
  write?: (line: string) => void;
  env?: NodeJS.ProcessEnv;
}): Promise<0 | 3 | 4> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const write = options?.write ?? ((line: string) => console.log(line));
  const env = options?.env ?? process.env;

  const landingUrl = env.LANDING_URL?.trim() || 'https://wordmet.com/vi';
  const port = env.PORT?.trim() || '3000';
  const liveUrl = `http://localhost:${port}/v1/public/prices`;

  let landingHtml: string;
  try {
    const res = await fetchImpl(landingUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      write(`cannot check: landing ${landingUrl} returned HTTP ${res.status}`);
      return 4;
    }
    landingHtml = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    write(`cannot check: failed to fetch landing ${landingUrl}: ${msg}`);
    return 4;
  }

  const landing = extractJsonLdPrices(landingHtml);
  if (!landing) {
    write(`cannot check: no JSON-LD paid offers found at ${landingUrl}`);
    return 4;
  }

  let live: PriceMap | null;
  try {
    const res = await fetchImpl(liveUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      write(`cannot check: live prices ${liveUrl} returned HTTP ${res.status}`);
      return 4;
    }
    live = parseLivePrices(await res.json());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    write(`cannot check: failed to fetch live prices ${liveUrl}: ${msg}`);
    return 4;
  }

  if (!live) {
    write(`cannot check: invalid live prices payload from ${liveUrl}`);
    return 4;
  }

  const diffs = comparePrices(landing, live);
  if (diffs.length === 0) return 0;

  write('months\tlanding_vnd\tlive_vnd');
  for (const d of diffs) {
    write(`${d.months}\t${d.landing}\t${d.live}`);
  }
  return 3;
}

const isMain =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (isMain) {
  runLandingPricesCheck()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      console.log(`cannot check: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 4;
    });
}
