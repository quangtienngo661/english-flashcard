-- AlterTable
ALTER TABLE "ai_eval_runs" ADD COLUMN     "config_id" UUID,
ADD COLUMN     "config_version" INTEGER;

-- AlterTable
ALTER TABLE "ai_models" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ai_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "instructions" TEXT NOT NULL,
    "examples" JSONB NOT NULL,
    "model_ref" UUID,
    "effort" TEXT,
    "thinking" TEXT,
    "max_output_tokens" INTEGER,
    "status" TEXT NOT NULL,
    "created_from" UUID,
    "note" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by" UUID,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "ai_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_live_configs" (
    "operation" TEXT NOT NULL,
    "config_id" UUID NOT NULL,
    "previous_config_id" UUID,
    "version" INTEGER NOT NULL DEFAULT 0,
    "last_number" INTEGER NOT NULL,

    CONSTRAINT "ai_live_configs_pkey" PRIMARY KEY ("operation")
);

-- CreateTable
CREATE TABLE "ai_config_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "config_id" UUID NOT NULL,
    "from_config_id" UUID,
    "candidate_run_id" UUID,
    "baseline_run_id" UUID,
    "warnings" JSONB NOT NULL DEFAULT '[]',
    "actor_id" UUID NOT NULL,
    "at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_config_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_configs_operation_number_key" ON "ai_configs"("operation", "number");

-- CreateIndex
CREATE INDEX "ai_config_events_operation_at_idx" ON "ai_config_events"("operation", "at");

-- CreateIndex
CREATE INDEX "ai_eval_runs_config_id_set_id_created_at_idx" ON "ai_eval_runs"("config_id", "set_id", "created_at");

-- AddForeignKey
ALTER TABLE "ai_configs" ADD CONSTRAINT "ai_configs_model_ref_fkey" FOREIGN KEY ("model_ref") REFERENCES "ai_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_live_configs" ADD CONSTRAINT "ai_live_configs_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "ai_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_live_configs" ADD CONSTRAINT "ai_live_configs_previous_config_id_fkey" FOREIGN KEY ("previous_config_id") REFERENCES "ai_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_config_events" ADD CONSTRAINT "ai_config_events_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "ai_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_config_events" ADD CONSTRAINT "ai_config_events_from_config_id_fkey" FOREIGN KEY ("from_config_id") REFERENCES "ai_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_config_events" ADD CONSTRAINT "ai_config_events_candidate_run_id_fkey" FOREIGN KEY ("candidate_run_id") REFERENCES "ai_eval_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_config_events" ADD CONSTRAINT "ai_config_events_baseline_run_id_fkey" FOREIGN KEY ("baseline_run_id") REFERENCES "ai_eval_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Closed sets and the one-draft rule (invisible to the Prisma drift check, like users_status_check before).
ALTER TABLE ai_configs ADD CONSTRAINT ai_configs_operation_check
  CHECK (operation IN ('generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'));
ALTER TABLE ai_configs ADD CONSTRAINT ai_configs_status_check CHECK (status IN ('draft', 'published', 'retired'));
ALTER TABLE ai_configs ADD CONSTRAINT ai_configs_thinking_check CHECK (thinking IS NULL OR thinking = 'off');
ALTER TABLE ai_configs ADD CONSTRAINT ai_configs_max_output_tokens_check CHECK (max_output_tokens IS NULL OR max_output_tokens > 0);
-- One draft per operation (B23).
CREATE UNIQUE INDEX ai_configs_one_draft_key ON ai_configs (operation) WHERE status = 'draft';
ALTER TABLE ai_config_events ADD CONSTRAINT ai_config_events_kind_check CHECK (kind IN ('publish', 'rollback'));

-- A run names exactly one of: a prompt revision, a draft from the Prompt page, a config; and a config run knows the version it tried.
ALTER TABLE ai_eval_runs DROP CONSTRAINT ai_eval_runs_prompt_check;
ALTER TABLE ai_eval_runs ADD CONSTRAINT ai_eval_runs_prompt_check CHECK (num_nonnulls(prompt_revision, draft, config_id) = 1);
ALTER TABLE ai_eval_runs ADD CONSTRAINT ai_eval_runs_config_check CHECK ((config_id IS NULL) = (config_version IS NULL));
