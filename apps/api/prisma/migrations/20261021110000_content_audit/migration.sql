-- AlterTable
ALTER TABLE "sense_revisions" ADD COLUMN     "published_by" UUID,
ADD COLUMN     "reviewed_at" TIMESTAMPTZ,
ADD COLUMN     "reviewed_by" UUID;

-- AlterTable
ALTER TABLE "senses" ADD COLUMN     "state_changed_at" TIMESTAMPTZ,
ADD COLUMN     "state_changed_by" UUID;
