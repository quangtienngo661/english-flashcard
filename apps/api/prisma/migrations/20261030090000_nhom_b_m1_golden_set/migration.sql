-- AlterTable
ALTER TABLE "ai_eval_examples" ADD COLUMN     "expected" JSONB,
ADD COLUMN     "revealed_at" TIMESTAMPTZ,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "source_ref" TEXT,
ADD COLUMN     "split" TEXT NOT NULL DEFAULT 'dev';

-- AlterTable
ALTER TABLE "ai_eval_runs" ADD COLUMN     "legacy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "price_cached_input" DECIMAL(12,4),
ADD COLUMN     "price_input" DECIMAL(12,4),
ADD COLUMN     "price_output" DECIMAL(12,4),
ADD COLUMN     "set_id" UUID;

-- CreateTable
CREATE TABLE "ai_eval_sets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "held_out_ratio" DECIMAL(3,2) NOT NULL,
    "frozen_by" UUID NOT NULL,
    "frozen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_eval_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_eval_set_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "set_id" UUID NOT NULL,
    "example_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "split" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "expected" JSONB,
    "revealed_at" TIMESTAMPTZ,

    CONSTRAINT "ai_eval_set_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_eval_run_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "run_id" UUID NOT NULL,
    "example_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "split" TEXT NOT NULL,
    "input" JSONB,
    "expected" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "output" JSONB,
    "raw_output" TEXT,
    "rule" JSONB,
    "expected_result" TEXT,
    "latency_ms" INTEGER,
    "cost_usd" DECIMAL(14,8),
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ai_eval_run_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_eval_sets_operation_version_key" ON "ai_eval_sets"("operation", "version");

-- CreateIndex
CREATE INDEX "ai_eval_set_items_example_id_idx" ON "ai_eval_set_items"("example_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_eval_set_items_set_id_example_id_key" ON "ai_eval_set_items"("set_id", "example_id");

-- CreateIndex
CREATE INDEX "ai_eval_run_items_run_id_status_idx" ON "ai_eval_run_items"("run_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_eval_run_items_run_id_example_id_key" ON "ai_eval_run_items"("run_id", "example_id");

-- CreateIndex
CREATE INDEX "ai_eval_examples_operation_split_idx" ON "ai_eval_examples"("operation", "split");

-- CreateIndex
CREATE INDEX "ai_eval_runs_set_id_idx" ON "ai_eval_runs"("set_id");

-- AddForeignKey
ALTER TABLE "ai_eval_set_items" ADD CONSTRAINT "ai_eval_set_items_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "ai_eval_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_eval_runs" ADD CONSTRAINT "ai_eval_runs_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "ai_eval_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_eval_run_items" ADD CONSTRAINT "ai_eval_run_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "ai_eval_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Data move (nhóm B design §4 "Dữ liệu có sẵn khi P1 migrate", R14). Every example that exists is a dev example by hand, with no expected answer yet.
-- (split, source and expected get their column defaults above.)
UPDATE ai_eval_runs SET legacy = true;

-- A run still queued or running at deploy time keeps going with the prices its model has now.
UPDATE ai_eval_runs r SET price_input = m.price_input, price_cached_input = m.price_cached_input, price_output = m.price_output
  FROM ai_models m WHERE m.provider = r.provider AND m.model_id = r.model AND r.status IN ('queued', 'running');

-- Each element of the old `items` Json becomes one row; `input` comes from the example if it still exists, else it stays NULL.
INSERT INTO ai_eval_run_items (run_id, example_id, position, split, input, expected, status, reason, output, raw_output, latency_ms, cost_usd)
SELECT r.id, (i->>'example_id')::uuid, coalesce(array_position(r.example_ids, (i->>'example_id')::uuid), 0) - 1, 'dev', e.input, NULL,
       i->>'status', i->>'reason', NULLIF(i->'output', 'null'::jsonb), i->>'raw_output', (i->>'latency_ms')::int, (i->>'cost_usd')::numeric
FROM ai_eval_runs r CROSS JOIN LATERAL jsonb_array_elements(r.items) AS i LEFT JOIN ai_eval_examples e ON e.id = (i->>'example_id')::uuid
ON CONFLICT (run_id, example_id) DO NOTHING;

-- Ids of a run still queued or running at deploy time that have no result yet.
INSERT INTO ai_eval_run_items (run_id, example_id, position, split, input, status, reason)
SELECT r.id, x.id, x.ord - 1, 'dev', e.input, CASE WHEN e.id IS NULL THEN 'skipped' ELSE 'pending' END, CASE WHEN e.id IS NULL THEN 'example-deleted' END
FROM ai_eval_runs r CROSS JOIN LATERAL unnest(r.example_ids) WITH ORDINALITY AS x(id, ord) LEFT JOIN ai_eval_examples e ON e.id = x.id
WHERE r.status IN ('queued', 'running')
  AND NOT EXISTS (SELECT 1 FROM ai_eval_run_items t WHERE t.run_id = r.id AND t.example_id = x.id)
ON CONFLICT (run_id, example_id) DO NOTHING;

-- Closed sets (invisible to the Prisma drift check, like users_status_check before).
ALTER TABLE ai_eval_examples ADD CONSTRAINT ai_eval_examples_split_check CHECK (split IN ('dev', 'held_out'));
ALTER TABLE ai_eval_examples ADD CONSTRAINT ai_eval_examples_source_check CHECK (source IN ('manual', 'import', 'report', 'real_judge'));
ALTER TABLE ai_eval_set_items ADD CONSTRAINT ai_eval_set_items_split_check CHECK (split IN ('dev', 'held_out'));
ALTER TABLE ai_eval_run_items ADD CONSTRAINT ai_eval_run_items_split_check CHECK (split IN ('dev', 'held_out'));
ALTER TABLE ai_eval_run_items ADD CONSTRAINT ai_eval_run_items_status_check
  CHECK (status IN ('pending', 'succeeded', 'transient_failure', 'permanent_failure', 'unavailable', 'in_progress', 'skipped'));
ALTER TABLE ai_eval_run_items ADD CONSTRAINT ai_eval_run_items_expected_result_check CHECK (expected_result IS NULL OR expected_result IN ('pass', 'fail'));
