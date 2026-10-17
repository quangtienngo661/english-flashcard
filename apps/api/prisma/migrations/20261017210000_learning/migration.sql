-- CreateTable
CREATE TABLE "learning_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "name_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learning_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "sense_id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "last_reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learning_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_items" (
    "group_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "group_items_pkey" PRIMARY KEY ("group_id","item_id")
);

-- CreateTable
CREATE TABLE "learning_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "sense_id" UUID NOT NULL,
    "group_id" UUID,
    "kind" TEXT NOT NULL,
    "answer" TEXT,
    "rating" TEXT,
    "level_before" INTEGER,
    "level_after" INTEGER,
    "due_before" DATE,
    "due_after" DATE,
    "was_due" BOOLEAN,
    "days_since_last" INTEGER,
    "review_id" UUID,
    "section" TEXT,
    "local_date" DATE NOT NULL,
    "at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learning_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "learning_groups_user_id_name_key_key" ON "learning_groups"("user_id", "name_key");

-- CreateIndex
CREATE UNIQUE INDEX "learning_items_user_id_sense_id_key" ON "learning_items"("user_id", "sense_id");

-- CreateIndex
CREATE INDEX "group_items_item_id_idx" ON "group_items"("item_id");

-- CreateIndex
CREATE INDEX "learning_log_user_id_group_id_local_date_idx" ON "learning_log"("user_id", "group_id", "local_date");

-- CreateIndex
CREATE INDEX "learning_log_user_id_item_id_idx" ON "learning_log"("user_id", "item_id");

-- AddForeignKey
ALTER TABLE "group_items" ADD CONSTRAINT "group_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "learning_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_items" ADD CONSTRAINT "group_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "learning_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Hand-written: constraints Prisma's schema language cannot express.
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_level_check" CHECK ("level" BETWEEN 0 AND 5);
ALTER TABLE "learning_log" ADD CONSTRAINT "learning_log_kind_check" CHECK ("kind" IN ('item_added', 'item_removed', 'review', 'relearn'));
ALTER TABLE "learning_log" ADD CONSTRAINT "learning_log_answer_check" CHECK ("answer" IN ('known', 'review'));
ALTER TABLE "learning_log" ADD CONSTRAINT "learning_log_rating_check" CHECK ("rating" IN ('Good', 'Again'));
ALTER TABLE "learning_log" ADD CONSTRAINT "learning_log_section_check" CHECK ("section" IN ('priority', 'due', 'new', 'early'));
-- A review_id is answered once per learner (B3E4); other log rows carry no review_id.
CREATE UNIQUE INDEX learning_log_user_review_key ON learning_log (user_id, review_id) WHERE review_id IS NOT NULL;
