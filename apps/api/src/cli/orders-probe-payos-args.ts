import { ORDER_CODE_EPOCH_MS } from '../entitlements/orders/order-codes.js';

// Arguments and output of `pnpm orders:probe-payos` (restore-safety). Pure: no clock, no network. Kept apart from the entry file.

export const PROBE_USAGE = 'usage: pnpm orders:probe-payos --from <ISO 8601 instant> --to <ISO 8601 instant>   (window at most 24 hours)\n'
  + 'A full 24 h window takes hours (about 3 payOS calls per second of window, 100 ms each): give the smallest window that covers the restore gap.\n'
  + 'A payOS error other than "not found" stops the walk: the rows printed so far are real, so run it again with a later --from.';

/** Consecutive order codes without a payOS link after which the rest of a second is skipped (the app fills slots from 0 with no gaps). */
export const PROBE_GAP = 3;

const MAX_WINDOW_MS = 24 * 60 * 60 * 1000;
// An instant with a date, a time and an explicit zone, so a window never depends on the machine's timezone.
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

export type ProbeRange = { from: Date; to: Date; gap: number };
export type ProbeRow = { orderCode: number; description: string; status: string; amount: number; amountPaid: number; createdAt: string; payers: string[] };

function instant(flag: string, value: string): { ok: true; date: Date } | { ok: false; error: string } {
  const date = ISO_INSTANT.test(value) ? new Date(value) : null;
  if (date === null || Number.isNaN(date.getTime())) return { ok: false, error: `${flag} is not an ISO 8601 instant: ${value}` };
  return { ok: true, date };
}

export function parseProbeArgs(argv: string[]): ({ ok: true } & ProbeRange) | { ok: false; error: string } {
  const values: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s, 2);
    if (flag !== '--from' && flag !== '--to') return { ok: false, error: `unknown argument: ${flag}` };
    const value = inline ?? argv[++i];
    if (value === undefined) return { ok: false, error: `${flag} needs a value` };
    values[flag] = value;
  }
  if (values['--from'] === undefined) return { ok: false, error: '--from is required' };
  if (values['--to'] === undefined) return { ok: false, error: '--to is required' };
  const from = instant('--from', values['--from']);
  if (!from.ok) return from;
  const to = instant('--to', values['--to']);
  if (!to.ok) return to;
  if (from.date.getTime() < ORDER_CODE_EPOCH_MS) {
    return { ok: false, error: '--from is before 2026-11-17T00:00:00Z, the start of time-based order codes' };
  }
  if (to.date.getTime() <= from.date.getTime()) return { ok: false, error: '--to must be after --from' };
  if (to.date.getTime() - from.date.getTime() > MAX_WINDOW_MS) return { ok: false, error: 'the window must not be longer than 24 hours' };
  return { ok: true, from: from.date, to: to.date, gap: PROBE_GAP };
}

/** One tab-separated line. The payer is the name only: an account number never reaches the output. */
export function formatProbeRow(row: ProbeRow): string {
  const clean = (text: string) => text.replace(/[\t\r\n]+/g, ' ');
  return [row.orderCode, row.description, row.status, row.amount, row.amountPaid, row.createdAt, row.payers.map(clean).join('; ')].join('\t');
}

export const PROBE_HEADER = ['order_code', 'description', 'status', 'amount', 'amount_paid', 'created_at', 'payers'].join('\t');
