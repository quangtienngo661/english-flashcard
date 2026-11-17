import { NotFoundError, type PayOS } from '@payos/node';
import { existsSync, realpathSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../common/config/app-config.js';
import { createPayosClient } from '../entitlements/billing/payos/payos.adapter.js';
import { ORDER_CODES_PER_SECOND, orderCodeAt, orderCodeSecond, orderDescription } from '../entitlements/orders/order-codes.js';
import { PROBE_HEADER, PROBE_USAGE, formatProbeRow, parseProbeArgs, type ProbeRange, type ProbeRow } from './orders-probe-payos-args.js';

// `pnpm orders:probe-payos --from <ISO> --to <ISO>`: lists the payOS payment links whose order code falls in a time window (restore-safety).
// Read-only: it only asks payOS (`paymentRequests.get`), it never writes and needs no database. Use it after a restore for the window
// [time of the restored backup, time of the failure]: a link payOS has but the database lost is an order to confirm by hand, with
// "Xác nhận thanh toán" in admin. Order codes come from the clock (100 slots a second, filled from 0 with no gaps), so each second is walked
// until `gap` codes in a row have no link. Output is a TSV table with the payer's name; an account number is never printed.
// Exit 2 on bad arguments, 1 when payOS is not real or a call fails, 0 otherwise.

const PAUSE_MS = 100;

/** Every link payOS has in `range`, ordered by order code. A NotFoundError means "no link for this code"; any other error is thrown. */
export async function probe(
  client: Pick<PayOS, 'paymentRequests'>, range: ProbeRange, sleep: (ms: number) => Promise<void>,
): Promise<ProbeRow[]> {
  const rows: ProbeRow[] = [];
  let first = true;
  for (let second = orderCodeSecond(range.from); second <= orderCodeSecond(range.to); second++) {
    let misses = 0;
    for (let slot = 0; slot < ORDER_CODES_PER_SECOND && misses < range.gap; slot++) {
      if (!first) await sleep(PAUSE_MS);
      first = false;
      const orderCode = orderCodeAt(second, slot);
      let link;
      try {
        link = await client.paymentRequests.get(orderCode);
      } catch (error) {
        if (error instanceof NotFoundError) {
          misses++;
          continue;
        }
        throw error;
      }
      misses = 0;
      const payers = link.transactions.map((transaction) => transaction.counterAccountName).filter((name): name is string => !!name);
      rows.push({
        orderCode, description: orderDescription(orderCode), status: link.status, amount: link.amount, amountPaid: link.amountPaid,
        createdAt: link.createdAt, payers: [...new Set(payers)],
      });
    }
  }
  return rows;
}

async function main(): Promise<void> {
  const args = parseProbeArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error(`${args.error}\n${PROBE_USAGE}`);
    process.exitCode = 2;
    return;
  }
  let secrets: string[] = [];
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const { payos } = loadConfig(process.env);
    secrets = [payos.apiKey, payos.checksumKey, payos.clientId].filter((value): value is string => value !== null && value !== '');
    if (payos.mode === 'fake') {
      console.error('fake mode: read fake_payos_links instead');
      process.exitCode = 1;
      return;
    }
    if (payos.mode === 'off') {
      console.error('payOS is not configured: set PAYOS_CLIENT_ID, PAYOS_API_KEY and PAYOS_CHECKSUM_KEY');
      process.exitCode = 1;
      return;
    }
    const rows = await probe(createPayosClient(payos), args, (ms) => delay(ms));
    console.log(PROBE_HEADER);
    for (const row of rows) console.log(formatProbeRow(row));
    console.error(`${rows.length} payment links`);
  } catch (error) {
    const text = error instanceof Error ? error.message : 'unknown error';
    console.error(`orders:probe-payos failed: ${secrets.reduce((message, secret) => message.split(secret).join('[redacted]'), text)}`);
    process.exitCode = 1;
  }
}

// Run only as the entry file, so a test can import `probe`.
const entry = process.argv[1];
if (entry !== undefined && existsSync(entry) && realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))) await main();
