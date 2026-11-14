-- AlterTable
ALTER TABLE "ai_eval_runs" ADD COLUMN     "hidden_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "ai_judges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "operations" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_judges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_judge_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "judge_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "criteria" JSONB NOT NULL,
    "instructions" TEXT NOT NULL,
    "examples" JSONB NOT NULL,
    "model_ref" UUID,
    "effort" TEXT,
    "thinking" TEXT,
    "max_output_tokens" INTEGER,
    "saved_by" UUID NOT NULL,
    "saved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_judge_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_judge_passes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "judge_revision_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "eval_run_id" UUID,
    "filters" JSONB,
    "limit" INTEGER,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "total" INTEGER,
    "judged" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(14,8),
    "started_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "finished_at" TIMESTAMPTZ,
    "heartbeat_at" TIMESTAMPTZ,

    CONSTRAINT "ai_judge_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_judge_pass_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pass_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "subject_kind" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "input" JSONB NOT NULL,
    "output" JSONB NOT NULL,
    "context" JSONB,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ai_judge_pass_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_judge_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "judge_revision_id" UUID NOT NULL,
    "subject_kind" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "criterion" TEXT NOT NULL,
    "verdict" TEXT,
    "problem" TEXT,
    "reason" TEXT,
    "pass_id" UUID NOT NULL,
    "call_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_judge_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_labels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "subject_kind" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "criterion" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "labeled_by" UUID NOT NULL,
    "labeled_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_judge_revisions_judge_id_revision_key" ON "ai_judge_revisions"("judge_id", "revision");

-- CreateIndex
CREATE INDEX "ai_judge_passes_eval_run_id_idx" ON "ai_judge_passes"("eval_run_id");

-- CreateIndex
CREATE INDEX "ai_judge_passes_status_heartbeat_at_idx" ON "ai_judge_passes"("status", "heartbeat_at");

-- CreateIndex
CREATE UNIQUE INDEX "ai_judge_pass_items_pass_id_subject_kind_subject_id_key" ON "ai_judge_pass_items"("pass_id", "subject_kind", "subject_id");

-- CreateIndex
CREATE INDEX "ai_judge_scores_subject_kind_subject_id_idx" ON "ai_judge_scores"("subject_kind", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_judge_scores_judge_revision_id_subject_kind_subject_id_c_key" ON "ai_judge_scores"("judge_revision_id", "subject_kind", "subject_id", "criterion");

-- CreateIndex
CREATE UNIQUE INDEX "ai_labels_subject_kind_subject_id_criterion_key" ON "ai_labels"("subject_kind", "subject_id", "criterion");

-- AddForeignKey
ALTER TABLE "ai_judge_revisions" ADD CONSTRAINT "ai_judge_revisions_judge_id_fkey" FOREIGN KEY ("judge_id") REFERENCES "ai_judges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_judge_revisions" ADD CONSTRAINT "ai_judge_revisions_model_ref_fkey" FOREIGN KEY ("model_ref") REFERENCES "ai_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_judge_passes" ADD CONSTRAINT "ai_judge_passes_judge_revision_id_fkey" FOREIGN KEY ("judge_revision_id") REFERENCES "ai_judge_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_judge_passes" ADD CONSTRAINT "ai_judge_passes_eval_run_id_fkey" FOREIGN KEY ("eval_run_id") REFERENCES "ai_eval_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_judge_pass_items" ADD CONSTRAINT "ai_judge_pass_items_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "ai_judge_passes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_judge_scores" ADD CONSTRAINT "ai_judge_scores_judge_revision_id_fkey" FOREIGN KEY ("judge_revision_id") REFERENCES "ai_judge_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_judge_scores" ADD CONSTRAINT "ai_judge_scores_pass_id_fkey" FOREIGN KEY ("pass_id") REFERENCES "ai_judge_passes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECKs and the partial unique index Prisma cannot express (nhóm B design §4).
ALTER TABLE ai_judges ADD CONSTRAINT ai_judges_operations_check
  CHECK (cardinality(operations) >= 1 AND operations <@ ARRAY['generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word']::text[]);
ALTER TABLE ai_judge_revisions ADD CONSTRAINT ai_judge_revisions_thinking_check CHECK (thinking IS NULL OR thinking = 'off');
ALTER TABLE ai_judge_revisions ADD CONSTRAINT ai_judge_revisions_max_output_tokens_check CHECK (max_output_tokens IS NULL OR max_output_tokens > 0);

ALTER TABLE ai_judge_passes ADD CONSTRAINT ai_judge_passes_kind_check CHECK (kind IN ('eval_run', 'real'));
ALTER TABLE ai_judge_passes ADD CONSTRAINT ai_judge_passes_operation_check
  CHECK (operation IN ('generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'));
ALTER TABLE ai_judge_passes ADD CONSTRAINT ai_judge_passes_status_check CHECK (status IN ('queued', 'running', 'finished', 'failed'));
ALTER TABLE ai_judge_passes ADD CONSTRAINT ai_judge_passes_kind_run_check CHECK ((kind = 'eval_run') = (eval_run_id IS NOT NULL));
-- One queued or running pass per judge revision (B16): a second start is refused by the database, not only by the service.
CREATE UNIQUE INDEX ai_judge_passes_one_active_key ON ai_judge_passes (judge_revision_id) WHERE status IN ('queued', 'running');

ALTER TABLE ai_judge_pass_items ADD CONSTRAINT ai_judge_pass_items_subject_kind_check CHECK (subject_kind IN ('eval_item', 'real_question'));
ALTER TABLE ai_judge_scores ADD CONSTRAINT ai_judge_scores_subject_kind_check CHECK (subject_kind IN ('eval_item', 'real_question'));
ALTER TABLE ai_judge_scores ADD CONSTRAINT ai_judge_scores_verdict_check CHECK (verdict IS NULL OR verdict IN ('pass', 'fail_major', 'fail_minor'));
ALTER TABLE ai_labels ADD CONSTRAINT ai_labels_subject_kind_check CHECK (subject_kind IN ('eval_item', 'real_question'));
ALTER TABLE ai_labels ADD CONSTRAINT ai_labels_verdict_check CHECK (verdict IN ('pass', 'fail_major', 'fail_minor'));

-- A judge call is a call of its own purpose.
ALTER TABLE ai_calls DROP CONSTRAINT ai_calls_purpose_check;
ALTER TABLE ai_calls ADD CONSTRAINT ai_calls_purpose_check CHECK (purpose IN ('learner', 'test', 'eval', 'judge'));

-- The starting judge (decisions D12, D33): revision 1, no model yet, made by the system actor. src/ai/judge/initial-judges.ts holds the same text.
WITH judge AS (
  INSERT INTO ai_judges (name, operations, active, created_by)
  VALUES ('Chỉ một đáp án', ARRAY['generate_cloze'], true, '00000000-0000-4000-8000-000000000060')
  RETURNING id
)
INSERT INTO ai_judge_revisions (judge_id, revision, criteria, instructions, examples, model_ref, saved_by)
SELECT id, 1,
  '[{"code":"single_answer","question":"Is the given word, in the forms of accepted_answers, the only answer that fits the blank?"}]'::jsonb,
  $p$You review one practice question that an AI wrote for a Vietnamese learner of English. You are not told who or what wrote it.

The user message is a JSON object with these fields:
- target_operation: the kind of question. "generate_cloze" is one English sentence with one blank, written as ___, that the learner fills.
- input: what the writer was given: word, part_of_speech, level (CEFR A1 to C2, or null), meaning_vi, context_label.
- output: what the writer produced: sentence, accepted_answers (the forms of the word that fill the blank), translation_vi.
- criteria: the checks to make, each with a code and a question.
- context: null, or {"session_words": [...]}: the other words the learner practises in the same session.

For each criterion give one verdict:
- "pass": the answer to the question is yes.
- "fail_major": no, and a learner who knows the word could reasonably write something else and be marked wrong.
- "fail_minor": no, but only in a small way that few learners would hit.

Criterion single_answer:
- fail_major when another word fits the blank naturally with the same meaning and is a very common word at the given level, or when a word in context.session_words fits the blank.
- fail_minor when the only other words that fit are rare synonyms or close variants of the word (for example "though" for "although").
- pass otherwise. The forms listed in accepted_answers are not other words.

Answer with three lists of the same length, one entry per criterion, in the order the criteria are given:
- codes: the criterion code.
- verdicts: "pass", "fail_major" or "fail_minor".
- reasons: one short English sentence; name the other word when there is one.$p$,
  '[]'::jsonb, NULL, '00000000-0000-4000-8000-000000000060'
FROM judge;
