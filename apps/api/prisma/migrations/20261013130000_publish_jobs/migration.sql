-- CreateTable
CREATE TABLE "publish_jobs" (
    "id" UUID NOT NULL,
    "filter" JSONB NOT NULL,
    "snapshot_count" INTEGER NOT NULL,
    "not_ready_count" INTEGER NOT NULL,
    "counters" JSONB NOT NULL,

    CONSTRAINT "publish_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_job_items" (
    "job_id" UUID NOT NULL,
    "sense_id" UUID NOT NULL,
    "revision_no" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,

    CONSTRAINT "publish_job_items_pkey" PRIMARY KEY ("job_id", "sense_id")
);

-- AddForeignKey
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_id_fkey" FOREIGN KEY ("id") REFERENCES "background_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_job_items" ADD CONSTRAINT "publish_job_items_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "publish_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written enumerated-text constraint, matching the pipeline migration style.
-- sense_id is Content-owned and deliberately has no FK (D3).
ALTER TABLE "publish_job_items" ADD CONSTRAINT "publish_job_items_outcome_check" CHECK ("outcome" IN ('pending', 'published', 'already_published', 'refused'));
