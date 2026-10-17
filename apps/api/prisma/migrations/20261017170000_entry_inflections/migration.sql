-- AlterTable
ALTER TABLE "sense_revisions" ADD COLUMN     "form_kind" TEXT,
ADD COLUMN     "form_of_entry_id" UUID;

-- CreateTable
CREATE TABLE "entry_inflections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "form" TEXT NOT NULL,
    "form_key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "entry_inflections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entry_inflections_form_key_idx" ON "entry_inflections"("form_key");

-- CreateIndex
CREATE UNIQUE INDEX "entry_inflections_entry_id_form_kind_key" ON "entry_inflections"("entry_id", "form", "kind");

-- AddForeignKey
ALTER TABLE "sense_revisions" ADD CONSTRAINT "sense_revisions_form_of_entry_id_fkey" FOREIGN KEY ("form_of_entry_id") REFERENCES "entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_inflections" ADD CONSTRAINT "entry_inflections_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written CHECKs (Prisma cannot express them).
ALTER TABLE "entry_inflections" ADD CONSTRAINT "entry_inflections_kind_check" CHECK ("kind" IN ('third_person', 'present_participle', 'past', 'past_participle', 'plural', 'comparative', 'superlative'));
ALTER TABLE "entry_inflections" ADD CONSTRAINT "entry_inflections_source_check" CHECK ("source" IN ('library', 'reviewed'));
ALTER TABLE "sense_revisions" ADD CONSTRAINT "sense_revisions_form_kind_check" CHECK ("form_kind" IN ('third_person', 'present_participle', 'past', 'past_participle', 'plural', 'comparative', 'superlative'));
