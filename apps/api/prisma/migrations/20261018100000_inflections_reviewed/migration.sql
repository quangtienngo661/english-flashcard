-- AlterTable
ALTER TABLE "entries" ADD COLUMN     "inflections_reviewed_at" TIMESTAMPTZ;

-- M3: entries that already hold a reviewed set keep "reviewed wins" under the new marker.
UPDATE "entries" SET "inflections_reviewed_at" = now()
WHERE EXISTS (SELECT 1 FROM "entry_inflections" i WHERE i."entry_id" = "entries"."id" AND i."source" = 'reviewed');
