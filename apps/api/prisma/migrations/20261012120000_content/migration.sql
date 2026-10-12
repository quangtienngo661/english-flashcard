-- CreateTable
CREATE TABLE "topics" (
    "code" TEXT NOT NULL,
    "archived_at" TIMESTAMPTZ,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "topic_names" (
    "topic_code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "topic_names_pkey" PRIMARY KEY ("topic_code", "language")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '',
    "url" TEXT,
    "license" TEXT NOT NULL DEFAULT '',
    "attribution" TEXT NOT NULL DEFAULT '',
    "display_priority" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "language" TEXT NOT NULL DEFAULT 'en',
    "lemma" VARCHAR(100) NOT NULL,
    "pos" TEXT NOT NULL,
    "entry_type" TEXT NOT NULL DEFAULT 'word',
    "function_word_derived" BOOLEAN NOT NULL DEFAULT false,
    "function_word_override" BOOLEAN,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entry_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "accepted_as_answer" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "entry_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entry_levels" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "source_id" UUID NOT NULL,
    "basis" TEXT NOT NULL,
    "source_extra" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entry_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "senses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entry_id" UUID NOT NULL,
    "context_label" TEXT,
    "state" TEXT NOT NULL DEFAULT 'open',
    "live_revision_id" UUID,
    "replaces_sense_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "senses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sense_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sense_id" UUID NOT NULL,
    "revision_no" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "draft_source" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ,
    "examples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topic_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accepted_forms" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "sense_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sense_revision_texts" (
    "revision_id" UUID NOT NULL,
    "language" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "sense_revision_texts_pkey" PRIMARY KEY ("revision_id", "language", "kind")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_name_version_key" ON "data_sources"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "entries_language_lemma_pos_key" ON "entries"("language", "lemma", "pos");

-- CreateIndex
CREATE UNIQUE INDEX "entry_variants_entry_id_text_key" ON "entry_variants"("entry_id", "text");

-- CreateIndex
CREATE UNIQUE INDEX "entry_levels_entry_id_source_id_level_key" ON "entry_levels"("entry_id", "source_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "sense_revisions_sense_id_revision_no_key" ON "sense_revisions"("sense_id", "revision_no");

-- CreateIndex
CREATE INDEX "sense_revisions_topic_codes_idx" ON "sense_revisions" USING GIN ("topic_codes");

-- AddForeignKey
ALTER TABLE "topic_names" ADD CONSTRAINT "topic_names_topic_code_fkey" FOREIGN KEY ("topic_code") REFERENCES "topics"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_variants" ADD CONSTRAINT "entry_variants_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_levels" ADD CONSTRAINT "entry_levels_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entry_levels" ADD CONSTRAINT "entry_levels_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "senses" ADD CONSTRAINT "senses_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "senses" ADD CONSTRAINT "senses_replaces_sense_id_fkey" FOREIGN KEY ("replaces_sense_id") REFERENCES "senses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sense_revisions" ADD CONSTRAINT "sense_revisions_sense_id_fkey" FOREIGN KEY ("sense_id") REFERENCES "senses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sense_revision_texts" ADD CONSTRAINT "sense_revision_texts_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "sense_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written catalog constraints, partial unique indexes and migration seeds.
-- These rules are not represented by Prisma's generated CREATE TABLE / index / FK SQL above.

ALTER TABLE "topic_names" ADD CONSTRAINT "topic_names_language_check" CHECK ("language" IN ('vi', 'en'));
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_kind_check" CHECK ("kind" IN ('third_party', 'owner'));
ALTER TABLE "entries" ADD CONSTRAINT "entries_language_check" CHECK ("language" IN ('en'));
ALTER TABLE "entries" ADD CONSTRAINT "entries_pos_check" CHECK ("pos" IN (
    'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'determiner',
    'conjunction', 'number', 'modal auxiliary', 'be-verb', 'do-verb', 'have-verb',
    'infinitive-to', 'interjection'
));
ALTER TABLE "entries" ADD CONSTRAINT "entries_entry_type_check" CHECK ("entry_type" IN ('word'));
ALTER TABLE "entry_variants" ADD CONSTRAINT "entry_variants_kind_check" CHECK ("kind" IN ('spelling', 'alias'));
ALTER TABLE "entry_levels" ADD CONSTRAINT "entry_levels_level_check" CHECK ("level" IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2'));
ALTER TABLE "entry_levels" ADD CONSTRAINT "entry_levels_basis_check" CHECK ("basis" IN ('imported', 'editorial'));
ALTER TABLE "senses" ADD CONSTRAINT "senses_state_check" CHECK ("state" IN ('open', 'unpublished', 'retired'));
ALTER TABLE "sense_revisions" ADD CONSTRAINT "sense_revisions_status_check" CHECK ("status" IN ('draft', 'reviewed', 'published', 'superseded', 'rejected'));
ALTER TABLE "sense_revisions" ADD CONSTRAINT "sense_revisions_draft_source_check" CHECK ("draft_source" IN ('csv', 'ui'));
ALTER TABLE "sense_revision_texts" ADD CONSTRAINT "sense_revision_texts_language_check" CHECK ("language" IN ('vi', 'en'));
ALTER TABLE "sense_revision_texts" ADD CONSTRAINT "sense_revision_texts_kind_check" CHECK ("kind" IN ('gloss', 'definition'));

-- Waiting replacements are defined by BOTH replaces_sense_id and a NULL live_revision_id.
CREATE UNIQUE INDEX senses_entry_label_live_key ON senses (entry_id, coalesce(context_label, '')) WHERE state <> 'retired' AND NOT (replaces_sense_id IS NOT NULL AND live_revision_id IS NULL);
CREATE UNIQUE INDEX senses_one_replacement_key ON senses (replaces_sense_id) WHERE replaces_sense_id IS NOT NULL AND live_revision_id IS NULL AND state <> 'retired';
CREATE UNIQUE INDEX sense_revisions_one_open_key ON sense_revisions (sense_id) WHERE status IN ('draft','reviewed');

INSERT INTO "data_sources" ("id", "kind", "name", "display_priority") VALUES
    ('00000000-0000-4000-8000-000000000001', 'owner', 'owner', 0);

INSERT INTO "topics" ("code") VALUES
    ('technology'), ('marketing'), ('business'), ('food'), ('daily-life');

INSERT INTO "topic_names" ("topic_code", "language", "name") VALUES
    ('technology', 'vi', 'Công nghệ'),
    ('marketing', 'vi', 'Tiếp thị'),
    ('business', 'vi', 'Kinh doanh'),
    ('food', 'vi', 'Ẩm thực'),
    ('daily-life', 'vi', 'Đời sống'),
    ('technology', 'en', 'technology'),
    ('marketing', 'en', 'marketing'),
    ('business', 'en', 'business'),
    ('food', 'en', 'food'),
    ('daily-life', 'en', 'daily-life');
