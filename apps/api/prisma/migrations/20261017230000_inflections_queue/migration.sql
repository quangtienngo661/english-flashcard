-- D29: background job queue for the inflection backfill.
ALTER TABLE "background_jobs" DROP CONSTRAINT "background_jobs_queue_check";
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_queue_check" CHECK ("queue" IN ('content-import', 'content-publish', 'content-inflections'));
