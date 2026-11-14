-- CreateTable
CREATE TABLE "entitlement_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "plan" TEXT,
    "limits" JSONB,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "reason" TEXT NOT NULL,
    "granted_by" UUID NOT NULL,
    "granted_by_role" TEXT NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "revoked_by" UUID,
    "revoke_reason" TEXT,
    "paid_renewal_action" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlement_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_grant_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "grant_id" UUID NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_by_role" TEXT NOT NULL,
    "old_starts_at" TIMESTAMPTZ NOT NULL,
    "new_starts_at" TIMESTAMPTZ NOT NULL,
    "old_ends_at" TIMESTAMPTZ NOT NULL,
    "new_ends_at" TIMESTAMPTZ NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entitlement_grant_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "external_subscription_id" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trial_ends_at" TIMESTAMPTZ,
    "trial_denied" BOOLEAN NOT NULL DEFAULT false,
    "payment_fingerprint" TEXT,
    "current_period_start" TIMESTAMPTZ,
    "current_period_end" TIMESTAMPTZ,
    "grace_ends_at" TIMESTAMPTZ,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "pending_interval" TEXT,
    "quota_anchor_at" TIMESTAMPTZ,
    "current_transaction_id" TEXT,
    "last_event_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "external_subscription_id" TEXT,
    "type" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "transaction_id" TEXT,
    "occurred_at" TIMESTAMPTZ NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "app_user_id" UUID,
    "user_id" UUID,
    "subscription_id" UUID,
    "payload" JSONB,
    "raw_payload" JSONB,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trial_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "payment_fingerprint" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "trial_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "pool" TEXT NOT NULL,
    "operation_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "release_reason" TEXT,
    "local_date" DATE,
    "system_date" DATE,
    "reserved_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "confirmed_at" TIMESTAMPTZ,
    "released_at" TIMESTAMPTZ,
    "credited_at" TIMESTAMPTZ,
    "note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entitlement_notices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "recipient_user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "subject_key" TEXT NOT NULL,
    "period_key" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "due_at" TIMESTAMPTZ NOT NULL,
    "window_ends_at" TIMESTAMPTZ NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error_at" TIMESTAMPTZ,
    "sent_at" TIMESTAMPTZ,

    CONSTRAINT "entitlement_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fake_billing_subscriptions" (
    "external_subscription_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "current_period_start" TIMESTAMPTZ,
    "current_period_end" TIMESTAMPTZ,
    "trial_ends_at" TIMESTAMPTZ,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "last_occurred_at" TIMESTAMPTZ NOT NULL,
    "end_trial_called_at" TIMESTAMPTZ,
    "cancel_called_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fake_billing_subscriptions_pkey" PRIMARY KEY ("external_subscription_id")
);

-- CreateIndex
CREATE INDEX "entitlement_grants_user_id_ends_at_idx" ON "entitlement_grants"("user_id", "ends_at");

-- CreateIndex
CREATE INDEX "entitlement_grants_granted_by_created_at_idx" ON "entitlement_grants"("granted_by", "created_at");

-- CreateIndex
CREATE INDEX "entitlement_grant_changes_grant_id_created_at_idx" ON "entitlement_grant_changes"("grant_id", "created_at");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_idx" ON "subscriptions"("user_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_status_current_period_end_idx" ON "subscriptions"("status", "current_period_end");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_provider_environment_external_subscription_id_key" ON "subscriptions"("provider", "environment", "external_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_events_dedupe_key_key" ON "billing_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "billing_events_status_received_at_idx" ON "billing_events"("status", "received_at");

-- CreateIndex
CREATE INDEX "billing_events_provider_environment_transaction_id_idx" ON "billing_events"("provider", "environment", "transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "trial_history_user_id_key" ON "trial_history"("user_id");

-- CreateIndex
CREATE INDEX "usage_records_user_id_pool_confirmed_at_idx" ON "usage_records"("user_id", "pool", "confirmed_at");

-- CreateIndex
CREATE INDEX "usage_records_pool_system_date_idx" ON "usage_records"("pool", "system_date");

-- CreateIndex
CREATE INDEX "entitlement_notices_state_due_at_idx" ON "entitlement_notices"("state", "due_at");

-- CreateIndex
CREATE UNIQUE INDEX "entitlement_notices_kind_subject_key_period_key_recipient_u_key" ON "entitlement_notices"("kind", "subject_key", "period_key", "recipient_user_id");

-- AddForeignKey
ALTER TABLE "entitlement_grant_changes" ADD CONSTRAINT "entitlement_grant_changes_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "entitlement_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- Hand-written: constraints Prisma's schema language cannot express (design §6).
ALTER TABLE "entitlement_grants" ADD CONSTRAINT "entitlement_grants_kind_check" CHECK ("kind" IN ('plan', 'limits'));
ALTER TABLE "entitlement_grants" ADD CONSTRAINT "entitlement_grants_kind_shape_check" CHECK (
  ("kind" = 'plan' AND "plan" = 'pro' AND "limits" IS NULL) OR ("kind" = 'limits' AND "plan" IS NULL AND "limits" IS NOT NULL)
);
ALTER TABLE "entitlement_grants" ADD CONSTRAINT "entitlement_grants_dates_check" CHECK ("ends_at" > "starts_at");
ALTER TABLE "entitlement_grants" ADD CONSTRAINT "entitlement_grants_granted_by_role_check" CHECK ("granted_by_role" IN ('admin', 'editor'));
ALTER TABLE "entitlement_grants" ADD CONSTRAINT "entitlement_grants_paid_renewal_action_check" CHECK ("paid_renewal_action" IN ('turned_off', 'not_supported'));
ALTER TABLE "entitlement_grant_changes" ADD CONSTRAINT "entitlement_grant_changes_changed_by_role_check" CHECK ("changed_by_role" IN ('admin', 'editor'));
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_environment_check" CHECK ("environment" IN ('sandbox', 'production'));
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_interval_check" CHECK ("interval" IN ('month', 'year'));
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_pending_interval_check" CHECK ("pending_interval" IN ('month', 'year'));
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_status_check" CHECK ("status" IN ('trialing', 'active', 'grace', 'on_hold', 'expired', 'revoked'));
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_environment_check" CHECK ("environment" IN ('sandbox', 'production'));
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_kind_check" CHECK ("kind" IN ('state', 'additive'));
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_status_check" CHECK ("status" IN ('pending', 'applied', 'stale', 'ignored', 'failed'));
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_pool_check" CHECK ("pool" IN ('practice_sessions', 'ai_practice', 'ai_lookup'));
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_kind_check" CHECK ("kind" IN ('use', 'credit'));
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_status_check" CHECK ("status" IN ('reserved', 'confirmed', 'released'));
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_credit_confirmed_check" CHECK ("kind" <> 'credit' OR "status" = 'confirmed');
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_release_reason_check" CHECK ("release_reason" IN ('caller', 'expired', 'late-confirm-free'));
ALTER TABLE "entitlement_notices" ADD CONSTRAINT "entitlement_notices_kind_check" CHECK ("kind" IN ('trial_started', 'trial_reminder', 'renewal_notice'));
ALTER TABLE "entitlement_notices" ADD CONSTRAINT "entitlement_notices_state_check" CHECK ("state" IN ('pending', 'sending', 'sent', 'failed', 'skipped'));
ALTER TABLE "fake_billing_subscriptions" ADD CONSTRAINT "fake_billing_subscriptions_status_check" CHECK ("status" IN ('trialing', 'active', 'grace', 'on_hold', 'expired', 'revoked'));
ALTER TABLE "fake_billing_subscriptions" ADD CONSTRAINT "fake_billing_subscriptions_interval_check" CHECK ("interval" IN ('month', 'year'));
-- A payment fingerprint gets one trial per provider (design §8).
CREATE UNIQUE INDEX trial_history_provider_fingerprint_key ON trial_history (provider, payment_fingerprint) WHERE payment_fingerprint IS NOT NULL;
-- One live use per operation (reserved or confirmed); a released row frees the operation id for a retry (design §7.1).
CREATE UNIQUE INDEX usage_records_live_use_key ON usage_records (user_id, pool, operation_id) WHERE kind = 'use' AND status IN ('reserved', 'confirmed');
-- One credit per refunded operation (design §7.2).
CREATE UNIQUE INDEX usage_records_credit_key ON usage_records (user_id, pool, operation_id) WHERE kind = 'credit';
-- The hourly job finds reservations past their two minutes.
CREATE INDEX usage_records_reserved_expires_at_idx ON usage_records (status, expires_at) WHERE status = 'reserved';
