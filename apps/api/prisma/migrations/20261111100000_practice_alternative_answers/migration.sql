-- Session synonyms (plan Task 9): an AI fill-in answered with a declared session word keeps the word typed beside the word asked.
-- AlterTable
ALTER TABLE "practice_session_items" ADD COLUMN     "alternative" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alternative_review_action" TEXT,
ADD COLUMN     "alternative_sense_id" UUID,
ADD COLUMN     "session_word_tries" INTEGER NOT NULL DEFAULT 0;

-- The typed word's own review button, as review_action is the asked word's.
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_alternative_review_action_check" CHECK ("alternative_review_action" IN ('needs_review', 'known'));

-- CreateIndex
CREATE INDEX "practice_session_items_user_id_alternative_sense_id_idx" ON "practice_session_items"("user_id", "alternative_sense_id");
