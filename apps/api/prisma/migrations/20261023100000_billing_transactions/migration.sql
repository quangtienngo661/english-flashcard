-- Learner UI M4b (design §8.9): one row per payment event a learner sees in the transaction history. No backfill (GI10).

-- CreateTable
CREATE TABLE "billing_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "subscription_id" UUID,
    "kind" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "interval" TEXT,
    "amount_minor" BIGINT,
    "currency" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "period_start" TIMESTAMPTZ NOT NULL,
    "period_end" TIMESTAMPTZ,
    "status" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "provider_transaction_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_transactions_user_id_occurred_at_id_idx" ON "billing_transactions"("user_id", "occurred_at" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "billing_transactions_occurred_at_id_idx" ON "billing_transactions"("occurred_at" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "billing_transactions_provider_environment_provider_transact_key" ON "billing_transactions"("provider", "environment", "provider_transaction_id", "kind");


-- CheckConstraints (as the entitlements migration)
ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_kind_check" CHECK ("kind" IN ('purchase', 'renewal', 'plan_change', 'refund', 'trial'));
ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_interval_check" CHECK ("interval" IN ('month', 'year'));
ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_status_check" CHECK ("status" IN ('succeeded', 'refunded', 'pending', 'reversed'));
ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_environment_check" CHECK ("environment" IN ('sandbox', 'production'));
ALTER TABLE "billing_transactions" ADD CONSTRAINT "billing_transactions_money_check" CHECK (("amount_minor" IS NULL) = ("currency" IS NULL));
