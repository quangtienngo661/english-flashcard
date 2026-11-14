-- CreateTable
CREATE TABLE "ai_models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "shutdown_at" TIMESTAMPTZ,
    "lifecycle" TEXT,
    "effort_levels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "thinking_off" TEXT,
    "structured_outputs" BOOLEAN,
    "max_output_tokens" INTEGER,
    "price_input" DECIMAL(12,4),
    "price_cached_input" DECIMAL(12,4),
    "price_output" DECIMAL(12,4),
    "note" TEXT,
    "info_checked_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_operation_settings" (
    "operation" TEXT NOT NULL,
    "model_ref" UUID,
    "effort" TEXT,
    "thinking" TEXT,
    "max_output_tokens" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_operation_settings_pkey" PRIMARY KEY ("operation")
);

-- CreateTable
CREATE TABLE "ai_operation_setting_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation" TEXT NOT NULL,
    "old_value" JSONB NOT NULL,
    "new_value" JSONB NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_operation_setting_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_prompts" (
    "operation" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "examples" JSONB NOT NULL,
    "revision" INTEGER NOT NULL,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompts_pkey" PRIMARY KEY ("operation")
);

-- CreateTable
CREATE TABLE "ai_prompt_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "instructions" TEXT NOT NULL,
    "examples" JSONB NOT NULL,
    "saved_by" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompt_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_operations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "operation_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "attempt_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "deadline_at" TIMESTAMPTZ NOT NULL,
    "result" JSONB,
    "meta" JSONB,
    "finished_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_calls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation_id" TEXT NOT NULL,
    "ai_operation_id" UUID,
    "attempt" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "effort" TEXT,
    "thinking" TEXT,
    "max_output_tokens" INTEGER,
    "prompt_revision" INTEGER,
    "outcome" TEXT NOT NULL,
    "http_status" INTEGER,
    "provider_error_code" TEXT,
    "latency_ms" INTEGER NOT NULL,
    "input_tokens" INTEGER,
    "cached_input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "reasoning_tokens" INTEGER,
    "cost_usd" DECIMAL(14,8),
    "cost_known" BOOLEAN NOT NULL,
    "provider_request_id" TEXT,
    "user_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_call_contents" (
    "call_id" UUID NOT NULL,
    "request" JSONB NOT NULL,
    "response" TEXT,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai_call_contents_pkey" PRIMARY KEY ("call_id")
);

-- CreateTable
CREATE TABLE "ai_eval_examples" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_eval_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_eval_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "effort" TEXT,
    "thinking" TEXT,
    "max_output_tokens" INTEGER,
    "prompt_revision" INTEGER,
    "draft" JSONB,
    "example_ids" UUID[] NOT NULL,
    "status" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "valid_count" INTEGER NOT NULL DEFAULT 0,
    "avg_latency_ms" INTEGER,
    "cost_usd" DECIMAL(14,8),
    "cost_unknown_count" INTEGER NOT NULL DEFAULT 0,
    "items" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "started_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "heartbeat_at" TIMESTAMPTZ,

    CONSTRAINT "ai_eval_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_models_provider_model_id_key" ON "ai_models"("provider", "model_id");

-- CreateIndex
CREATE INDEX "ai_operation_setting_changes_operation_changed_at_idx" ON "ai_operation_setting_changes"("operation", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_revisions_operation_revision_key" ON "ai_prompt_revisions"("operation", "revision");

-- CreateIndex
CREATE INDEX "ai_operations_expires_at_idx" ON "ai_operations"("expires_at");

-- CreateIndex
CREATE INDEX "ai_operations_status_deadline_at_idx" ON "ai_operations"("status", "deadline_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_operations_user_id_operation_id_key" ON "ai_operations"("user_id", "operation_id");

-- CreateIndex
CREATE INDEX "ai_calls_created_at_idx" ON "ai_calls"("created_at");

-- CreateIndex
CREATE INDEX "ai_calls_operation_id_idx" ON "ai_calls"("operation_id");

-- CreateIndex
CREATE INDEX "ai_calls_user_id_idx" ON "ai_calls"("user_id");

-- CreateIndex
CREATE INDEX "ai_call_contents_expires_at_idx" ON "ai_call_contents"("expires_at");

-- CreateIndex
CREATE INDEX "ai_eval_examples_operation_idx" ON "ai_eval_examples"("operation");

-- CreateIndex
CREATE INDEX "ai_eval_runs_operation_created_at_idx" ON "ai_eval_runs"("operation", "created_at");

-- CreateIndex
CREATE INDEX "ai_eval_runs_status_heartbeat_at_idx" ON "ai_eval_runs"("status", "heartbeat_at");

-- AddForeignKey
ALTER TABLE "ai_operation_settings" ADD CONSTRAINT "ai_operation_settings_model_ref_fkey" FOREIGN KEY ("model_ref") REFERENCES "ai_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CHECKs (design §11; plan choice 2 for ai_calls.outcome).
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_provider_check" CHECK ("provider" IN ('openai', 'anthropic', 'fake'));
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_lifecycle_check" CHECK ("lifecycle" IN ('active', 'deprecated', 'retired'));
ALTER TABLE "ai_models" ADD CONSTRAINT "ai_models_thinking_off_check" CHECK ("thinking_off" IN ('disabled', 'between_tools'));
ALTER TABLE "ai_operation_settings" ADD CONSTRAINT "ai_operation_settings_operation_check" CHECK ("operation" IN ('generate_cloze', 'lookup_word', 'translate_sentence'));
ALTER TABLE "ai_operation_settings" ADD CONSTRAINT "ai_operation_settings_thinking_check" CHECK ("thinking" IN ('off'));
ALTER TABLE "ai_operation_settings" ADD CONSTRAINT "ai_operation_settings_max_output_tokens_check" CHECK ("max_output_tokens" > 0);
ALTER TABLE "ai_operations" ADD CONSTRAINT "ai_operations_status_check" CHECK ("status" IN ('running', 'succeeded', 'permanent_failure'));
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_attempt_check" CHECK ("attempt" BETWEEN 1 AND 2);
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_purpose_check" CHECK ("purpose" IN ('learner', 'test', 'eval'));
ALTER TABLE "ai_calls" ADD CONSTRAINT "ai_calls_outcome_check" CHECK ("outcome" IN ('succeeded', 'timeout', 'connection', 'rate-limited', 'provider-error', 'invalid-shape', 'truncated', 'stopped', 'refused', 'model-rejected', 'auth-failed', 'provider-quota'));
ALTER TABLE "ai_eval_runs" ADD CONSTRAINT "ai_eval_runs_prompt_check" CHECK (("prompt_revision" IS NULL) <> ("draft" IS NULL));
ALTER TABLE "ai_eval_runs" ADD CONSTRAINT "ai_eval_runs_status_check" CHECK ("status" IN ('queued', 'running', 'finished', 'failed'));

-- The three operations start off (model_ref null, D9) with their default token limits (design §5.4, §6.3).
INSERT INTO "ai_operation_settings" ("operation", "model_ref", "effort", "thinking", "max_output_tokens", "version") VALUES
  ('generate_cloze', NULL, NULL, NULL, 1200, 0),
  ('lookup_word', NULL, NULL, NULL, 1200, 0),
  ('translate_sentence', NULL, NULL, NULL, 800, 0);
