import { existsSync } from 'node:fs';
import { loadConfig } from '../common/config/app-config.js';
import { createPayosClient } from '../entitlements/billing/payos/payos.adapter.js';
import { PAYOS_CONFIRM_USAGE, confirmWebhook, parseConfirmWebhookArgs } from './payos-confirm-webhook-args.js';

// `pnpm payos:confirm-webhook <url>`: registers the webhook URL with payOS (design §3.3). Exit 2 on bad arguments, 1 on a refusal or when payOS
// is not configured, 0 on success. It needs no database: only the three PAYOS_* variables (read like the API reads them).
async function main(): Promise<void> {
  const args = parseConfirmWebhookArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error(`${args.error}\n${PAYOS_CONFIRM_USAGE}`);
    process.exitCode = 2;
    return;
  }
  try {
    if (existsSync('.env')) process.loadEnvFile('.env');
    const config = loadConfig(process.env);
    const result = await confirmWebhook(config.payos, args.url, createPayosClient);
    if (result.ok) console.log(result.message);
    else {
      console.error(result.error);
      process.exitCode = 1;
    }
  } catch {
    console.error('payos:confirm-webhook failed (check the environment variables)');
    process.exitCode = 1;
  }
}

await main();
