-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "group_id" UUID,
    "group_filter" TEXT,
    "sort" TEXT NOT NULL,
    "types" TEXT[],
    "prompt_style" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL,
    "sense_ids" UUID[],
    "status" TEXT NOT NULL,
    "continued" BOOLEAN,
    "pending_notice" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL,
    "last_activity_at" TIMESTAMPTZ NOT NULL,
    "ended_at" TIMESTAMPTZ,

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "sense_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "prompt_style" TEXT NOT NULL,
    "blank" JSONB,
    "schema_version" INTEGER NOT NULL,
    "prompt" JSONB NOT NULL,
    "answer_key" JSONB NOT NULL,
    "hints" JSONB NOT NULL,
    "distractor_sense_ids" UUID[],
    "created_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "practice_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_session_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "sense_id" UUID NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "asked_at" TIMESTAMPTZ NOT NULL,
    "answered_at" TIMESTAMPTZ,
    "answer_raw" TEXT,
    "answer_normalized" TEXT,
    "answers_tried" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tries" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "result" TEXT,
    "hint_level" INTEGER NOT NULL DEFAULT 0,
    "local_date" DATE,
    "review_action" TEXT,

    CONSTRAINT "practice_session_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "item_id" UUID,
    "sense_id" UUID NOT NULL,
    "question_snapshot" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "practice_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "practice_sessions_status_last_activity_at_idx" ON "practice_sessions"("status", "last_activity_at");

-- CreateIndex
CREATE INDEX "practice_session_items_user_id_sense_id_answered_at_idx" ON "practice_session_items"("user_id", "sense_id", "answered_at");

-- CreateIndex
CREATE INDEX "practice_session_items_user_id_local_date_idx" ON "practice_session_items"("user_id", "local_date");

-- CreateIndex
CREATE INDEX "practice_session_items_asked_at_idx" ON "practice_session_items"("asked_at");

-- CreateIndex
CREATE INDEX "practice_session_items_question_id_idx" ON "practice_session_items"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "practice_session_items_session_id_position_key" ON "practice_session_items"("session_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "practice_reports_item_id_key" ON "practice_reports"("item_id");

-- CreateIndex
CREATE INDEX "practice_reports_status_created_at_idx" ON "practice_reports"("status", "created_at");

-- AddForeignKey
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "practice_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "practice_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_reports" ADD CONSTRAINT "practice_reports_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "practice_session_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- Hand-written: constraints Prisma's schema language cannot express.
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_source_check" CHECK ("source" IN ('today', 'all', 'group', 'weak', 'priority'));
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_group_filter_check" CHECK ("group_filter" IN ('all', 'due', 'priority', '0', '1', '2', '3', '4', '5'));
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_sort_check" CHECK ("sort" IN ('level_asc', 'overdue_first', 'new_first', 'least_practiced', 'most_wrong', 'queue', 'priority_oldest', 'random'));
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_types_check" CHECK ("types" <@ ARRAY['mcq_definition', 'true_false_definition', 'type_word']::TEXT[]);
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_prompt_style_check" CHECK ("prompt_style" IN ('meaning', 'sentence', 'mixed'));
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_status_check" CHECK ("status" IN ('active', 'waiting_continue', 'finished', 'abandoned'));
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_pending_notice_check" CHECK ("pending_notice" IN ('word-not-found'));
ALTER TABLE "practice_questions" ADD CONSTRAINT "practice_questions_type_check" CHECK ("type" IN ('mcq_definition', 'true_false_definition', 'type_word'));
ALTER TABLE "practice_questions" ADD CONSTRAINT "practice_questions_prompt_style_check" CHECK ("prompt_style" IN ('meaning', 'sentence'));
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_result_check" CHECK ("result" IN ('correct', 'wrong', 'void'));
ALTER TABLE "practice_session_items" ADD CONSTRAINT "practice_session_items_review_action_check" CHECK ("review_action" IN ('needs_review', 'known'));
ALTER TABLE "practice_reports" ADD CONSTRAINT "practice_reports_reason_check" CHECK ("reason" IN ('meaning_wrong', 'graded_wrong', 'hint_wrong', 'other'));
ALTER TABLE "practice_reports" ADD CONSTRAINT "practice_reports_status_check" CHECK ("status" IN ('open', 'no_error', 'fixed'));
-- At most one open session per learner (design 5.1).
CREATE UNIQUE INDEX practice_sessions_open_key ON practice_sessions (user_id) WHERE status IN ('active', 'waiting_continue');
