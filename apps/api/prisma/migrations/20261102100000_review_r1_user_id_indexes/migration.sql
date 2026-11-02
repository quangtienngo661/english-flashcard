-- Review R1 (improvement plan §7b): indexes for the per-user lookups, the account erasers and the hourly cleanups, which
-- otherwise scan the whole table. Names are the ones Prisma generates, so the schema drift check stays empty.

-- CreateIndex
CREATE INDEX "session_chains_user_id_idx" ON "session_chains"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_chain_id_idx" ON "refresh_tokens"("chain_id");

-- CreateIndex
CREATE INDEX "otp_codes_user_id_purpose_idx" ON "otp_codes"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "practice_reports_user_id_created_at_idx" ON "practice_reports"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "practice_ai_requests_user_id_idx" ON "practice_ai_requests"("user_id");

-- CreateIndex
CREATE INDEX "billing_events_user_id_idx" ON "billing_events"("user_id");

-- CreateIndex
CREATE INDEX "billing_events_app_user_id_idx" ON "billing_events"("app_user_id");

-- CreateIndex
CREATE INDEX "billing_events_subscription_id_idx" ON "billing_events"("subscription_id");

-- CreateIndex
CREATE INDEX "entitlement_notices_user_id_idx" ON "entitlement_notices"("user_id");

-- CreateIndex
CREATE INDEX "entitlement_notices_recipient_user_id_idx" ON "entitlement_notices"("recipient_user_id");

-- CreateIndex
CREATE INDEX "idempotency_keys_user_id_idx" ON "idempotency_keys"("user_id");

-- CreateIndex
CREATE INDEX "batch_records_record_type_record_id_idx" ON "batch_records"("record_type", "record_id");

-- CreateIndex
-- Beside the Bước 7 partial index practice_questions_ai_user_sense_idx (same columns, AI questions only), which Prisma does not
-- see as an index of its own. This full one serves the history read, the account eraser and the private-word cleanup.
CREATE INDEX "practice_questions_user_id_sense_id_idx" ON "practice_questions"("user_id", "sense_id");
