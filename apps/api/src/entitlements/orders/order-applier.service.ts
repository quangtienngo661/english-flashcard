import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Payer } from '../billing/billing-adapter.js';
import type { BillingEnvironment } from '../entitlements.types.js';

// Applies one-time payments to orders (launch prep B design §3.4). The rules T1–T14 arrive in Task 10; this is the seam Task 8 routes to.

/** What happened to a payment. `ignored` carries the reason (`not-success`, `missing-fields`, `unknown-order`, `link-mismatch`). */
export type OrderApplyResult = {
  outcome: 'opened-period' | 'attached' | 'counted' | 'flagged' | 'refund-needed' | 'ignored';
  reason?: string;
  periodId?: string;
  /** The learner the order belonged to; null when the account is gone, so the stored event keeps no id that could name them. */
  userId?: string | null;
};

export type ApplyPaymentInput = {
  source: 'webhook' | 'reconcile';
  env: BillingEnvironment;
  orderCode: number;
  paymentLinkId: string;
  reference: string;
  amount: number;
  /** As payOS wrote it (Vietnam time, no zone), or null. */
  providerTime: string | null;
  success: boolean;
  code: string;
  payer: Payer | null;
  eventId?: string;
};

export type ConfirmManualInput = { orderId: string; adminId: string; reference: string; amount: number; reason: string };

@Injectable()
export class OrderApplier {
  /** Runs inside the transaction of the inbox row it came from (claim → this), so the lock order of design §3.4 holds. */
  async applyPayment(_tx: Prisma.TransactionClient, _input: ApplyPaymentInput): Promise<OrderApplyResult> {
    throw new Error('OrderApplier.applyPayment: the rules T1–T14 are not written yet');
  }

  async confirmManual(_input: ConfirmManualInput): Promise<OrderApplyResult> {
    throw new Error('OrderApplier.confirmManual: the rules T11–T14 are not written yet');
  }
}
