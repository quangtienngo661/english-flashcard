-- Bước 7 (design §12.1, §12.2, §9.1): Practice AI questions, report reasons, unknown forms; Content word form additions.
-- AlterTable
ALTER TABLE "practice_questions" ADD COLUMN     "ai_charged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ai_meta" JSONB,
ADD COLUMN     "ai_request_id" TEXT,
ADD COLUMN     "content_key" TEXT,
ADD COLUMN     "sense_revision_id" UUID,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'rule';

-- AlterTable
ALTER TABLE "practice_reports" ADD COLUMN     "ai_charged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ai_meta" JSONB,
ADD COLUMN     "ai_operation_id" TEXT,
ADD COLUMN     "question_source" TEXT NOT NULL DEFAULT 'rule',
ADD COLUMN     "reason_label" TEXT,
ADD COLUMN     "refunded" BOOLEAN,
ADD COLUMN     "resolved_by_role" TEXT;

-- AlterTable
ALTER TABLE "practice_sessions" ADD COLUMN     "ai_notice_shown" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ai_planned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ai_sense_ids" UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN     "ai_stopped" TEXT,
ADD COLUMN     "cloze_source" TEXT,
ADD COLUMN     "pending_ai_request_id" UUID;

-- CreateTable
CREATE TABLE "word_form_additions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lemma_key" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "form_key" TEXT NOT NULL,
    "added_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_form_additions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_ai_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "session_id" UUID,
    "sense_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "state" TEXT NOT NULL,
    "failure" TEXT,
    "ai_input" JSONB,
    "question_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_ai_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_report_reasons" (
    "code" TEXT NOT NULL,
    "label_vi" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "detail_hint_vi" TEXT,
    "detail_hint_en" TEXT,
    "applies_to" TEXT NOT NULL,
    "note_required" BOOLEAN NOT NULL,
    "refundable" BOOLEAN NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,

    CONSTRAINT "practice_report_reasons_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "practice_unknown_forms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lemma_key" TEXT NOT NULL,
    "form_key" TEXT NOT NULL,
    "form" TEXT NOT NULL,
    "rejected_count" INTEGER NOT NULL DEFAULT 1,
    "first_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practice_unknown_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_word_checks" (
    "user_id" UUID NOT NULL,
    "sense_id" UUID NOT NULL,
    "content_key" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "checked_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "practice_word_checks_pkey" PRIMARY KEY ("user_id","sense_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "word_form_additions_lemma_key_form_key_key" ON "word_form_additions"("lemma_key", "form_key");

-- CreateIndex
CREATE INDEX "practice_ai_requests_session_id_state_idx" ON "practice_ai_requests"("session_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "practice_unknown_forms_lemma_key_form_key_key" ON "practice_unknown_forms"("lemma_key", "form_key");

-- Hand-written: the seven reasons of design §9.1 (the admin edits them later), then the label of existing reports.
INSERT INTO "practice_report_reasons" ("code", "label_vi", "label_en", "detail_hint_vi", "detail_hint_en", "applies_to", "note_required", "refundable", "position") VALUES
    ('meaning_wrong', 'Nghĩa sai', 'The meaning is wrong', NULL, NULL, 'all', false, false, 1),
    ('graded_wrong', 'Đáp án đúng mà bị chấm sai', 'My right answer was marked wrong', NULL, NULL, 'all', false, false, 2),
    ('hint_wrong', 'Gợi ý sai', 'The hint is wrong', NULL, NULL, 'all', false, false, 3),
    ('other', 'Khác', 'Other', NULL, NULL, 'all', false, false, 4),
    ('ai_sentence_unnatural', 'Câu sai ngữ pháp hoặc không tự nhiên', 'The sentence is ungrammatical or unnatural', NULL, NULL, 'ai', false, true, 5),
    ('ai_more_than_one_answer', 'Có hơn một đáp án đúng', 'More than one answer is right', 'Từ nào khác cũng đúng?', 'Which other word also fits?', 'ai', false, true, 6),
    ('ai_wrong_meaning', 'Câu dùng sai nghĩa của từ', 'The sentence uses the wrong meaning of the word', NULL, NULL, 'ai', false, true, 7);
UPDATE "practice_reports" r SET "reason_label" = x."label_vi" FROM "practice_report_reasons" x WHERE x."code" = r."reason";
ALTER TABLE "practice_reports" ALTER COLUMN "reason_label" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "practice_reports" ADD CONSTRAINT "practice_reports_reason_fkey" FOREIGN KEY ("reason") REFERENCES "practice_report_reasons"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: constraints Prisma's schema language cannot express (design §12.1, §12.2).
ALTER TABLE "practice_reports" DROP CONSTRAINT "practice_reports_reason_check";
ALTER TABLE "practice_reports" DROP CONSTRAINT "practice_reports_status_check";
ALTER TABLE "practice_reports" ADD CONSTRAINT "practice_reports_status_check" CHECK ("status" IN ('open', 'no_error', 'fixed', 'confirmed'));
ALTER TABLE "practice_reports" ADD CONSTRAINT "practice_reports_question_source_check" CHECK ("question_source" IN ('rule', 'ai', 'own_sentence'));
ALTER TABLE "practice_sessions" DROP CONSTRAINT "practice_sessions_types_check";
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_types_check" CHECK ("types" <@ ARRAY['mcq_definition', 'true_false_definition', 'type_word', 'cloze', 'meaning_in_sentence', 'mcq_sentence']::TEXT[]);
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_cloze_source_check" CHECK ("cloze_source" IN ('ai', 'own'));
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_ai_stopped_check" CHECK ("ai_stopped" IN ('quota-exhausted', 'plan-required', 'ai-unavailable'));
ALTER TABLE "practice_questions" DROP CONSTRAINT "practice_questions_type_check";
ALTER TABLE "practice_questions" ADD CONSTRAINT "practice_questions_type_check" CHECK ("type" IN ('mcq_definition', 'true_false_definition', 'type_word', 'cloze', 'meaning_in_sentence', 'mcq_sentence'));
ALTER TABLE "practice_questions" ADD CONSTRAINT "practice_questions_source_check" CHECK ("source" IN ('rule', 'ai', 'own_sentence'));
ALTER TABLE "practice_ai_requests" ADD CONSTRAINT "practice_ai_requests_state_check" CHECK ("state" IN ('generating', 'ready', 'failed'));
ALTER TABLE "practice_report_reasons" ADD CONSTRAINT "practice_report_reasons_applies_to_check" CHECK ("applies_to" IN ('ai', 'non_ai', 'all'));
ALTER TABLE "practice_word_checks" ADD CONSTRAINT "practice_word_checks_verdict_check" CHECK ("verdict" IN ('ok', 'not_recognized'));
ALTER TABLE "sense_revisions" DROP CONSTRAINT "sense_revisions_draft_source_check";
ALTER TABLE "sense_revisions" ADD CONSTRAINT "sense_revisions_draft_source_check" CHECK ("draft_source" IN ('csv', 'ui', 'user', 'ai_suggestion'));
-- At most one generation per learner and sense at a time (design §6.5).
CREATE UNIQUE INDEX practice_ai_requests_generating_key ON practice_ai_requests (user_id, sense_id) WHERE state = 'generating';
-- Finding unseen AI questions of a sense (design §12.1).
CREATE INDEX practice_questions_ai_user_sense_idx ON practice_questions (user_id, sense_id) WHERE source = 'ai';
