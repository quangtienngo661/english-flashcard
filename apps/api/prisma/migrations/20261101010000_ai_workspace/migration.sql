-- AlterTable
ALTER TABLE "ai_calls" ADD COLUMN     "batch_id" UUID;

-- AlterTable
ALTER TABLE "ai_configs" ADD COLUMN     "deleted_at" TIMESTAMPTZ,
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ai_eval_runs" ADD COLUMN     "batch_id" UUID,
ADD COLUMN     "fingerprint" TEXT,
ADD COLUMN     "snapshot" JSONB;

-- CreateTable
CREATE TABLE "ai_config_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "config_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "fingerprint" TEXT,
    "name" TEXT,
    "note" TEXT,
    "saved_by" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_config_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "config_id" UUID,
    "config_version" INTEGER,
    "fingerprint" TEXT,
    "snapshot" JSONB,
    "source_id" UUID,
    "parent_id" UUID,
    "model" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "actor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "ai_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_config_revisions_config_id_version_key" ON "ai_config_revisions"("config_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ai_batches_source_id_key" ON "ai_batches"("source_id");

-- CreateIndex
CREATE INDEX "ai_batches_created_at_id_idx" ON "ai_batches"("created_at", "id");

-- CreateIndex
CREATE INDEX "ai_batches_config_id_idx" ON "ai_batches"("config_id");

-- CreateIndex
CREATE INDEX "ai_calls_batch_id_idx" ON "ai_calls"("batch_id");

-- AddForeignKey
ALTER TABLE "ai_config_revisions" ADD CONSTRAINT "ai_config_revisions_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "ai_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- One operation can now own several draft configs. Published/live pointers are unchanged.
DROP INDEX IF EXISTS ai_configs_one_draft_key;
UPDATE ai_configs SET name = 'Cấu hình ' || number::text, updated_at = COALESCE(published_at, created_at);
-- Only the version that still exists can be imported. NULL hash is canonicalized on read, never fabricated.
INSERT INTO ai_config_revisions (config_id,version,content,fingerprint,name,note,saved_by,saved_at)
SELECT id,version,jsonb_build_object('instructions',instructions,'examples',examples,'model_ref',model_ref,
 'effort',effort,'thinking',thinking,'max_output_tokens',max_output_tokens),NULL,name,note,COALESCE(published_by,created_by),updated_at FROM ai_configs;
ALTER TABLE ai_batches ADD CONSTRAINT ai_batches_kind_check CHECK (kind IN ('test','eval','judge'));
ALTER TABLE ai_batches ADD CONSTRAINT ai_batches_status_check CHECK (status IN ('queued','running','finished','failed','cancelled'));
ALTER TABLE ai_batches ADD CONSTRAINT ai_batches_total_check CHECK (total >= 0);
-- Existing eval/judge ids give an exact batch provenance. Do not guess a batch for unrelated test calls.
INSERT INTO ai_batches (id,kind,operation,status,config_id,config_version,source_id,model,provider,total,actor_id,created_at,started_at,finished_at)
SELECT id,'eval',operation,status,config_id,config_version,id,model,provider,total,started_by,created_at,started_at,finished_at FROM ai_eval_runs;
UPDATE ai_eval_runs SET batch_id=id;
INSERT INTO ai_batches (id,kind,operation,status,source_id,parent_id,model,provider,total,actor_id,created_at,started_at,finished_at)
SELECT p.id,'judge',p.operation,p.status,p.id,r.batch_id,COALESCE(m.model_id,'unknown'),COALESCE(m.provider,'unknown'),COALESCE(p.total,0),p.started_by,p.created_at,p.started_at,p.finished_at
FROM ai_judge_passes p JOIN ai_judge_revisions j ON j.id=p.judge_revision_id LEFT JOIN ai_models m ON m.id=j.model_ref LEFT JOIN ai_eval_runs r ON r.id=p.eval_run_id;
UPDATE ai_calls c SET batch_id=r.id FROM ai_eval_runs r JOIN ai_eval_run_items i ON i.run_id=r.id
WHERE c.purpose='eval' AND c.operation_id='eval-'||r.id::text||'-'||i.example_id::text;
UPDATE ai_calls c SET batch_id=p.id FROM ai_judge_passes p JOIN ai_judge_pass_items i ON i.pass_id=p.id
WHERE c.purpose='judge' AND c.operation_id='judge-'||p.id::text||'-'||i.id::text;
