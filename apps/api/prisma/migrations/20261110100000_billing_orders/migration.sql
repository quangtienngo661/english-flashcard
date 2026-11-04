-- Launch prep B M1 (design §3.2): prepaid Pro periods bought once through payOS. Three money tables, one table for the fake payOS,
-- the order-code sequence, and two CHECKs widened (transaction interval gets 'quarter', notice kind gets the two new mails).

-- Order codes: 10^9 and up, so payOS's test webhook (orderCode 123) never matches a real order (§3.5).
CREATE SEQUENCE "billing_order_code_seq" START 1000000000;

-- CreateTable
CREATE TABLE "billing_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "order_code" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "period_months" INTEGER NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "review_reason" TEXT,
    "paid_via" TEXT,
    "payment_link_id" TEXT,
    "checkout_url" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "checked_at" TIMESTAMPTZ,
    "refund_payer_name" TEXT,
    "refund_payer_account" TEXT,
    "refund_payer_bank" TEXT,
    "refund_saved_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "resolved_by" UUID,
    "resolution_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_order_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "payment_key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "provider_time" TEXT,
    "outcome" TEXT NOT NULL,
    "period_id" UUID,
    "confirmed_by" UUID,
    "reason" TEXT,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_order_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prepaid_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "revoked_by" UUID,
    "revoke_reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prepaid_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fake_payos_links" (
    "order_code" BIGINT NOT NULL,
    "payment_link_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "transactions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fake_payos_links_pkey" PRIMARY KEY ("order_code")
);

-- CreateIndex
CREATE INDEX "billing_orders_status_created_at_idx" ON "billing_orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "billing_orders_user_id_idx" ON "billing_orders"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_orders_provider_order_code_key" ON "billing_orders"("provider", "order_code");

-- CreateIndex
CREATE UNIQUE INDEX "billing_order_payments_payment_key_key" ON "billing_order_payments"("payment_key");

-- CreateIndex
CREATE INDEX "billing_order_payments_order_id_idx" ON "billing_order_payments"("order_id");

-- CreateIndex
CREATE INDEX "billing_order_payments_period_id_idx" ON "billing_order_payments"("period_id");

-- CreateIndex
CREATE INDEX "prepaid_periods_user_id_ends_at_idx" ON "prepaid_periods"("user_id", "ends_at");

-- CreateIndex
CREATE INDEX "prepaid_periods_order_id_idx" ON "prepaid_periods"("order_id");

-- CreateIndex
CREATE INDEX "prepaid_periods_payment_id_idx" ON "prepaid_periods"("payment_id");

-- AddForeignKey
ALTER TABLE "billing_order_payments" ADD CONSTRAINT "billing_order_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "billing_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_order_payments" ADD CONSTRAINT "billing_order_payments_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "prepaid_periods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prepaid_periods" ADD CONSTRAINT "prepaid_periods_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "billing_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prepaid_periods" ADD CONSTRAINT "prepaid_periods_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "billing_order_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Hand-written: constraints Prisma's schema language cannot express (design §3.2).
-- 34359738367 = 32^7 - 1: the largest order_code whose description fits 'WM' + 7 base32 characters, and below Number.MAX_SAFE_INTEGER.
ALTER TABLE "billing_orders" ADD CONSTRAINT "billing_orders_order_code_check" CHECK ("order_code" BETWEEN 1000000000 AND 34359738367);
ALTER TABLE "billing_orders" ADD CONSTRAINT "billing_orders_environment_check" CHECK ("environment" IN ('sandbox', 'production'));
ALTER TABLE "billing_orders" ADD CONSTRAINT "billing_orders_period_months_check" CHECK ("period_months" IN (1, 3, 12));
ALTER TABLE "billing_orders" ADD CONSTRAINT "billing_orders_status_check" CHECK ("status" IN ('pending', 'paid', 'expired', 'cancelled', 'failed', 'needs_review', 'closed'));
ALTER TABLE "billing_orders" ADD CONSTRAINT "billing_orders_review_reason_check" CHECK ("review_reason" IN ('amount-short', 'amount-over', 'late-payment', 'account-deleted', 'extra-payment', 'reconcile-mismatch', 'provider-mismatch'));
-- needs_review always says why; on a paid order the reason is a flag, so it is allowed there too.
ALTER TABLE "billing_orders" ADD CONSTRAINT "billing_orders_needs_review_reason_check" CHECK ("status" <> 'needs_review' OR "review_reason" IS NOT NULL);
ALTER TABLE "billing_orders" ADD CONSTRAINT "billing_orders_paid_via_check" CHECK ("paid_via" IN ('webhook', 'reconcile', 'manual'));
ALTER TABLE "billing_order_payments" ADD CONSTRAINT "billing_order_payments_source_check" CHECK ("source" IN ('webhook', 'reconcile', 'manual'));
ALTER TABLE "billing_order_payments" ADD CONSTRAINT "billing_order_payments_outcome_check" CHECK ("outcome" IN ('opened-period', 'attached', 'counted', 'flagged', 'refund-needed'));
ALTER TABLE "fake_payos_links" ADD CONSTRAINT "fake_payos_links_status_check" CHECK ("status" IN ('PENDING', 'CANCELLED', 'UNDERPAID', 'PAID', 'EXPIRED', 'PROCESSING', 'FAILED'));

-- A 3-month period is a transaction interval of its own (design §3.2); the subscription CHECKs keep month | year.
ALTER TABLE "billing_transactions" DROP CONSTRAINT "billing_transactions_interval_check";
ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_interval_check" CHECK ("interval" IN ('month', 'quarter', 'year'));

-- Two mails of the prepaid flow (M2): the period is about to end, and the receipt.
ALTER TABLE "entitlement_notices" DROP CONSTRAINT "entitlement_notices_kind_check";
ALTER TABLE "entitlement_notices" ADD CONSTRAINT "entitlement_notices_kind_check" CHECK ("kind" IN ('trial_started', 'trial_reminder', 'renewal_notice', 'expiry_notice', 'payment_receipt'));
