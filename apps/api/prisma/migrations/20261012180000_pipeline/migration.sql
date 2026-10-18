-- CreateTable
CREATE TABLE "background_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "queue" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "exclusive_key" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lease_owner" TEXT,
    "lease_epoch" INTEGER NOT NULL DEFAULT 0,
    "lease_expires_at" TIMESTAMPTZ,
    "created_by" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "error_summary" TEXT,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL,
    "level_source_id" UUID,
    "file_name" TEXT NOT NULL,
    "file_sha256" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "row_count" INTEGER NOT NULL,
    "raw_headers" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "counters" JSONB NOT NULL,
    "reverted_at" TIMESTAMPTZ,
    "revert_report" JSONB,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batch_files" (
    "batch_id" UUID NOT NULL,
    "content" BYTEA NOT NULL,

    CONSTRAINT "import_batch_files_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "import_row_outcomes" (
    "batch_id" UUID NOT NULL,
    "row_number" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "error_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "raw" JSONB,

    CONSTRAINT "import_row_outcomes_pkey" PRIMARY KEY ("batch_id", "row_number")
);

-- CreateTable
CREATE TABLE "import_row_keys" (
    "kind" TEXT NOT NULL,
    "source_id" UUID NOT NULL,
    "row_key" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "batch_id" UUID NOT NULL
);

-- CreateTable
CREATE TABLE "batch_records" (
    "batch_id" UUID NOT NULL,
    "record_type" TEXT NOT NULL,
    "record_id" UUID NOT NULL,
    "meta" JSONB
);

-- CreateIndex
CREATE UNIQUE INDEX "import_row_keys_kind_source_id_row_key_content_hash_key" ON "import_row_keys"("kind", "source_id", "row_key", "content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "batch_records_batch_id_record_type_record_id_key" ON "batch_records"("batch_id", "record_type", "record_id");

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_id_fkey" FOREIGN KEY ("id") REFERENCES "background_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch_files" ADD CONSTRAINT "import_batch_files_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_row_outcomes" ADD CONSTRAINT "import_row_outcomes_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_row_keys" ADD CONSTRAINT "import_row_keys_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_records" ADD CONSTRAINT "batch_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written pipeline constraints, partial unique index and reconciler scan index.
-- These rules are not represented by Prisma's generated CREATE TABLE / index / FK SQL above.
-- Cross-module ids (created_by, level_source_id, source_id, record_id) deliberately have no FK (D3).

ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_queue_check" CHECK ("queue" IN ('content-import', 'content-publish'));
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_status_check" CHECK ("status" IN ('queued', 'running', 'succeeded', 'partial', 'failed'));
ALTER TABLE "import_row_outcomes" ADD CONSTRAINT "import_row_outcomes_outcome_check" CHECK ("outcome" IN ('created', 'updated', 'unchanged', 'rejected'));
ALTER TABLE "import_row_keys" ADD CONSTRAINT "import_row_keys_kind_check" CHECK ("kind" IN ('level', 'content'));
ALTER TABLE "batch_records" ADD CONSTRAINT "batch_records_record_type_check" CHECK ("record_type" IN ('entry', 'variant', 'level', 'sense', 'revision'));

-- Serialize running jobs for the same level source across workers without session advisory locks.
-- Queued/finished jobs may share a key; NULL keys do not serialize unrelated jobs.
CREATE UNIQUE INDEX background_jobs_exclusive_key_running_key ON background_jobs (exclusive_key) WHERE status = 'running';

-- The shared reconciler scans by queue and status to find queued jobs and expired leases.
CREATE INDEX background_jobs_queue_status_lease_expires_at_idx ON background_jobs (queue, status, lease_expires_at);
